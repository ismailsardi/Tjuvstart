using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Sync;

/// <summary>Applies pushed changes and serves pulls, following the merge rules in ADR 0011.</summary>
public sealed class SyncService(SyncDbContext db)
{
    public const int MaxPullLimit = 500;

    public async Task<PushResponse> PushAsync(Guid accountId, IReadOnlyList<SyncChange> changes, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(changes);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Locking the account row serializes pushes per account, so sequence numbers are handed
        // out without gaps or duplicates, and a pull never sees a later number before an earlier one.
        var sequence = await db.Database
            .SqlQuery<long>($"SELECT sync_sequence AS \"Value\" FROM accounts WHERE id = {accountId} FOR UPDATE")
            .SingleAsync(cancellationToken);

        var accepted = 0;
        foreach (var change in changes)
        {
            var next = sequence + 1;
            var data = change.Deleted ? null : change.Data!.Value.GetRawText();
            var written = SyncCollections.All[change.Collection] switch
            {
                MergeRule.AppendOnly => await db.Database.ExecuteSqlAsync(
                    $"""
                    INSERT INTO sync_records (account_id, collection, key, data, updated_at, sequence)
                    VALUES ({accountId}, {change.Collection}, {change.Key}, {data}::jsonb, {change.UpdatedAt}, {next})
                    ON CONFLICT (account_id, collection, key) DO NOTHING
                    """,
                    cancellationToken),

                // Strictly newer wins. A tie keeps the stored version, which also makes a repeated
                // push of the same change a no-op.
                _ => await db.Database.ExecuteSqlAsync(
                    $"""
                    INSERT INTO sync_records (account_id, collection, key, data, updated_at, sequence)
                    VALUES ({accountId}, {change.Collection}, {change.Key}, {data}::jsonb, {change.UpdatedAt}, {next})
                    ON CONFLICT (account_id, collection, key) DO UPDATE
                    SET data = excluded.data, updated_at = excluded.updated_at, sequence = excluded.sequence
                    WHERE sync_records.updated_at < excluded.updated_at
                    """,
                    cancellationToken),
            };

            if (written == 1)
            {
                sequence = next;
                accepted++;
            }
        }

        await db.Accounts
            .Where(a => a.Id == accountId)
            .ExecuteUpdateAsync(set => set.SetProperty(a => a.SyncSequence, sequence), cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new PushResponse(accepted, changes.Count - accepted, sequence);
    }

    public async Task<PullResponse> PullAsync(Guid accountId, long after, int limit, CancellationToken cancellationToken)
    {
        var rows = await db.SyncRecords
            .AsNoTracking()
            .Where(r => r.AccountId == accountId && r.Sequence > after)
            .OrderBy(r => r.Sequence)
            .Take(limit + 1)
            .ToListAsync(cancellationToken);

        var page = rows.Take(limit).Select(ToSynced).ToList();
        var cursor = page.Count > 0 ? page[^1].Sequence : after;
        return new PullResponse(page, cursor, rows.Count > limit);
    }

    internal static SyncedRecord ToSynced(SyncRecord r) =>
        new(r.Collection, r.Key, r.UpdatedAt, r.Data is null ? null : JsonElement.Parse(r.Data), r.Data is null, r.Sequence);
}
