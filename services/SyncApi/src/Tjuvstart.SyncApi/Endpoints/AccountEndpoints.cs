using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Tjuvstart.SyncApi.Data;
using Tjuvstart.SyncApi.Sync;

namespace Tjuvstart.SyncApi.Endpoints;

public sealed record LinkedIdentity(string Provider, string? Email);

public sealed record AccountResponse(Guid AccountId, DateTimeOffset CreatedAt, IReadOnlyList<LinkedIdentity> Identities);

public sealed record ExportedIdentity(string Provider, string? Email, DateTimeOffset LinkedAt);

public sealed record ExportedRecord(string Key, long UpdatedAt, JsonElement Data);

/// <summary>Everything stored for an account (GDPR access and portability).</summary>
public sealed record AccountExport(
    DateTimeOffset ExportedAt,
    Guid AccountId,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastSeenAt,
    IReadOnlyList<ExportedIdentity> Identities,
    IReadOnlyDictionary<string, IReadOnlyList<ExportedRecord>> Collections);

public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/account", GetAccountAsync)
            .RequireAuthorization()
            .WithTags("Account")
            .WithName("GetAccount")
            .WithSummary("Returns the signed-in account and the logins linked to it.");

        group.MapGet("/account/export", ExportAsync)
            .RequireAuthorization()
            .WithTags("Account")
            .WithName("ExportAccount")
            .WithSummary("Downloads everything stored for the account as one JSON document.");

        group.MapDelete("/account", DeleteAsync)
            .RequireAuthorization()
            .WithTags("Account")
            .WithName("DeleteAccount")
            .WithSummary("Permanently deletes the account and all its data.");

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

    private static async Task<Results<FileContentHttpResult, NotFound>> ExportAsync(
        ClaimsPrincipal user, SyncDbContext db, TimeProvider timeProvider, CancellationToken cancellationToken)
    {
        var accountId = user.AccountId();
        var account = await db.Accounts
            .AsNoTracking()
            .Include(a => a.Identities)
            .SingleOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null)
        {
            return TypedResults.NotFound();
        }

        var records = await db.SyncRecords
            .AsNoTracking()
            .Where(r => r.AccountId == accountId && r.Data != null)
            .OrderBy(r => r.Collection).ThenBy(r => r.Sequence)
            .ToListAsync(cancellationToken);

        var now = timeProvider.GetUtcNow();
        var export = new AccountExport(
            now,
            account.Id,
            account.CreatedAt,
            account.LastSeenAt,
            account.Identities.OrderBy(i => i.CreatedAt).Select(i => new ExportedIdentity(i.Provider, i.Email, i.CreatedAt)).ToList(),
            SyncCollections.All.Keys.Order(StringComparer.Ordinal).ToDictionary(
                name => name,
                IReadOnlyList<ExportedRecord> (name) => records
                    .Where(r => r.Collection == name)
                    .Select(r => new ExportedRecord(r.Key, r.UpdatedAt, JsonElement.Parse(r.Data!)))
                    .ToList()));

        var json = JsonSerializer.SerializeToUtf8Bytes(export, ExportJson);
        return TypedResults.File(json, "application/json", $"tjuvstart-export-{now:yyyy-MM-dd}.json");
    }

    /// <summary>
    /// Hard delete in one statement: identities, refresh tokens and synced records go with the
    /// account through the schema's cascades (ADR 0011). Open access tokens stop working for
    /// anything that needs the account, and expire within minutes.
    /// </summary>
    private static async Task<NoContent> DeleteAsync(ClaimsPrincipal user, SyncDbContext db, CancellationToken cancellationToken)
    {
        var accountId = user.AccountId();
        await db.Accounts.Where(a => a.Id == accountId).ExecuteDeleteAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static readonly JsonSerializerOptions ExportJson = new(JsonSerializerDefaults.Web) { WriteIndented = true };
}
