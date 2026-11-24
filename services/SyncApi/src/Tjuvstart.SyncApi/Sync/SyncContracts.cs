using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Sync;

/// <summary>One local change the client uploads.</summary>
public sealed record SyncChange : IValidatableObject
{
    public const int MaxDataBytes = 16 * 1024;

    [Required, MaxLength(32)]
    public required string Collection { get; init; }

    [Required, MaxLength(SyncRecord.KeyMaxLength)]
    public required string Key { get; init; }

    /// <summary>When the record changed on the device, in milliseconds since the epoch.</summary>
    [Range(0, long.MaxValue)]
    public long UpdatedAt { get; init; }

    /// <summary>The record as a JSON object. Leave out when <see cref="Deleted"/> is true.</summary>
    public JsonElement? Data { get; init; }

    public bool Deleted { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!SyncCollections.All.TryGetValue(Collection ?? "", out var rule))
        {
            yield return new ValidationResult($"'{Collection}' is not a synced collection.", [nameof(Collection)]);
            yield break;
        }

        if (Deleted)
        {
            if (rule == MergeRule.AppendOnly)
            {
                yield return new ValidationResult($"Records in '{Collection}' cannot be deleted.", [nameof(Deleted)]);
            }

            yield break;
        }

        if (Data is not { ValueKind: JsonValueKind.Object } data)
        {
            yield return new ValidationResult("Data must be a JSON object.", [nameof(Data)]);
        }
        else if (data.GetRawText().Length > MaxDataBytes)
        {
            yield return new ValidationResult($"Data must be at most {MaxDataBytes} bytes.", [nameof(Data)]);
        }
    }
}

public sealed record PushRequest
{
    public const int MaxChanges = 500;

    [Required, MaxLength(MaxChanges)]
    public required IReadOnlyList<SyncChange> Changes { get; init; }
}

/// <param name="Accepted">Changes the server stored.</param>
/// <param name="Ignored">Changes the server already had, or older than the stored version.</param>
/// <param name="Cursor">The account's latest sequence number after this push.</param>
public sealed record PushResponse(int Accepted, int Ignored, long Cursor);

/// <summary>A stored record as the client receives it on pull.</summary>
public sealed record SyncedRecord(string Collection, string Key, long UpdatedAt, JsonElement? Data, bool Deleted, long Sequence);

/// <param name="Cursor">Pass as <c>after</c> on the next pull.</param>
/// <param name="HasMore">True when more changes are waiting; pull again straight away.</param>
public sealed record PullResponse(IReadOnlyList<SyncedRecord> Changes, long Cursor, bool HasMore);
