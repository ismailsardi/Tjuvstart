using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Auth;

/// <summary>What the client keeps after signing in or refreshing.</summary>
public sealed record Session(
    Guid AccountId,
    bool IsNewAccount,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt);

/// <summary>Creates sessions on sign-in and rotates refresh tokens.</summary>
public sealed partial class SessionService(
    SyncDbContext db,
    AccessTokenIssuer accessTokens,
    IOptions<AuthOptions> options,
    TimeProvider timeProvider,
    ILogger<SessionService> logger)
{
    /// <summary>Signs in with a verified provider identity, creating the account on first sign-in.</summary>
    public async Task<Session> SignInAsync(VerifiedIdentity identity, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(identity);
        var now = timeProvider.GetUtcNow();
        var email = identity.Email is { Length: <= ExternalIdentity.EmailMaxLength } e ? e : null;

        var account = await FindAccountAsync(identity, cancellationToken);
        var isNew = account is null;
        if (account is null)
        {
            account = new Account { CreatedAt = now, LastSeenAt = now };
            account.Identities.Add(new ExternalIdentity
            {
                Provider = identity.Provider,
                Subject = identity.Subject,
                Email = email,
                CreatedAt = now,
            });
            db.Accounts.Add(account);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // Two first sign-ins raced (say, two tabs). The other one created the account; use it.
                db.ChangeTracker.Clear();
                account = await FindAccountAsync(identity, cancellationToken)
                    ?? throw new InvalidOperationException("Account vanished after a unique violation.", ex);
                isNew = false;
            }
        }

        if (!isNew)
        {
            account.LastSeenAt = now;
            var stored = account.Identities.Single(i => i.Provider == identity.Provider);
            if (email is not null)
            {
                // Apple only sends the e-mail on the first sign-in, so never clear a known one.
                stored.Email = email;
            }
        }

        var session = await StartFamilyAsync(account.Id, isNew, now, cancellationToken);
        LogSignedIn(logger, account.Id, identity.Provider, isNew);
        return session;
    }

    /// <summary>
    /// Exchanges a refresh token for a new session. Returns <c>null</c> when the token is unknown,
    /// expired or revoked. A token that was already used revokes its whole family.
    /// </summary>
    public async Task<Session?> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        var hash = Hash(refreshToken);
        var token = await db.RefreshTokens.AsNoTracking().SingleOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);
        if (token is null || token.RevokedAt is not null || token.ExpiresAt <= now)
        {
            return null;
        }

        // Claim the token atomically, so two concurrent refreshes cannot both succeed.
        var claimed = await db.RefreshTokens
            .Where(t => t.Id == token.Id && t.UsedAt == null)
            .ExecuteUpdateAsync(set => set.SetProperty(t => t.UsedAt, now), cancellationToken);
        if (claimed == 0)
        {
            await RevokeFamilyAsync(token.FamilyId, now, cancellationToken);
            LogRefreshTokenReuse(logger, token.AccountId);
            return null;
        }

        await db.Accounts
            .Where(a => a.Id == token.AccountId)
            .ExecuteUpdateAsync(set => set.SetProperty(a => a.LastSeenAt, now), cancellationToken);

        return await IssueAsync(token.AccountId, token.FamilyId, isNewAccount: false, now, cancellationToken);
    }

    /// <summary>Revokes the session the refresh token belongs to. Unknown tokens are ignored.</summary>
    public async Task SignOutAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var hash = Hash(refreshToken);
        var familyId = await db.RefreshTokens
            .Where(t => t.TokenHash == hash)
            .Select(t => (Guid?)t.FamilyId)
            .SingleOrDefaultAsync(cancellationToken);
        if (familyId is { } id)
        {
            await RevokeFamilyAsync(id, timeProvider.GetUtcNow(), cancellationToken);
        }
    }

    internal static byte[] Hash(string refreshToken) => SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));

    private Task<Account?> FindAccountAsync(VerifiedIdentity identity, CancellationToken cancellationToken) =>
        db.Accounts
            .Include(a => a.Identities)
            .SingleOrDefaultAsync(
                a => a.Identities.Any(i => i.Provider == identity.Provider && i.Subject == identity.Subject),
                cancellationToken);

    private Task<Session> StartFamilyAsync(Guid accountId, bool isNew, DateTimeOffset now, CancellationToken cancellationToken) =>
        IssueAsync(accountId, Guid.CreateVersion7(), isNew, now, cancellationToken);

    private async Task<Session> IssueAsync(
        Guid accountId, Guid familyId, bool isNewAccount, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var refreshToken = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
        var expiresAt = now + options.Value.RefreshTokenLifetime;
        db.RefreshTokens.Add(new RefreshToken
        {
            AccountId = accountId,
            FamilyId = familyId,
            TokenHash = Hash(refreshToken),
            CreatedAt = now,
            ExpiresAt = expiresAt,
        });
        await db.SaveChangesAsync(cancellationToken);

        var access = accessTokens.Issue(accountId);
        return new Session(accountId, isNewAccount, access.Token, access.ExpiresAt, refreshToken, expiresAt);
    }

    private Task<int> RevokeFamilyAsync(Guid familyId, DateTimeOffset now, CancellationToken cancellationToken) =>
        db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .ExecuteUpdateAsync(set => set.SetProperty(t => t.RevokedAt, now), cancellationToken);

    [LoggerMessage(Level = LogLevel.Information, Message = "Account {AccountId} signed in with {Provider} (new account: {IsNew})")]
    private static partial void LogSignedIn(ILogger logger, Guid accountId, string provider, bool isNew);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refresh token reused for account {AccountId}; revoked the session")]
    private static partial void LogRefreshTokenReuse(ILogger logger, Guid accountId);
}
