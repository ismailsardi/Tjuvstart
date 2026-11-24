using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Endpoints;

public sealed record LinkedIdentity(string Provider, string? Email);

public sealed record AccountResponse(Guid AccountId, DateTimeOffset CreatedAt, IReadOnlyList<LinkedIdentity> Identities);

public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/account", GetAccountAsync)
            .RequireAuthorization()
            .WithTags("Account")
            .WithName("GetAccount")
            .WithSummary("Returns the signed-in account and the logins linked to it.");

        return group;
    }

    /// <summary>The account id from the access token's <c>sub</c> claim.</summary>
    public static Guid AccountId(this ClaimsPrincipal user)
    {
        ArgumentNullException.ThrowIfNull(user);
        return Guid.Parse(user.FindFirstValue("sub") ?? throw new InvalidOperationException("Access token has no subject."));
    }

    private static async Task<Results<Ok<AccountResponse>, NotFound>> GetAccountAsync(
        ClaimsPrincipal user, SyncDbContext db, CancellationToken cancellationToken)
    {
        var accountId = user.AccountId();
        var account = await db.Accounts
            .AsNoTracking()
            .Where(a => a.Id == accountId)
            .Select(a => new AccountResponse(
                a.Id,
                a.CreatedAt,
                a.Identities.OrderBy(i => i.CreatedAt).Select(i => new LinkedIdentity(i.Provider, i.Email)).ToList()))
            .SingleOrDefaultAsync(cancellationToken);

        // The token can outlive the account by a few minutes after deletion.
        return account is null ? TypedResults.NotFound() : TypedResults.Ok(account);
    }
}
