namespace Tjuvstart.SyncApi.Data;

/// <summary>
/// A learner who has signed in at least once. The account holds no personal details itself:
/// who the learner is comes from the linked identity providers (ADR 0011).
/// </summary>
public sealed class Account
{
    public Guid Id { get; init; } = Guid.CreateVersion7();

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset LastSeenAt { get; set; }

    public List<ExternalIdentity> Identities { get; init; } = [];
}
