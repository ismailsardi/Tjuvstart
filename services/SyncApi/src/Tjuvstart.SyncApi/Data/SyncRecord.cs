namespace Tjuvstart.SyncApi.Data;

/// <summary>
/// One synced client record, for example a card's review schedule or one logged answer. The
/// record body is stored as JSON exactly as the client sent it, so the client can add fields
/// without a server release; the server only needs the collection, key and timestamps.
/// </summary>
public sealed class SyncRecord
{
    public const int KeyMaxLength = 128;

    public Guid AccountId { get; init; }

    public required string Collection { get; init; }

    public required string Key { get; init; }

    /// <summary>The record as JSON. Null for a deleted record (a tombstone).</summary>
    public string? Data { get; set; }

    /// <summary>When the client last changed the record, in milliseconds since the epoch.</summary>
    public long UpdatedAt { get; set; }

    /// <summary>The account's change sequence number when the server accepted this version.</summary>
    public long Sequence { get; set; }
}
