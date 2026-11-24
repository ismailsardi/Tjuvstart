namespace Tjuvstart.SyncApi.Data;

/// <summary>
/// A refresh token, stored only as a SHA-256 hash. Each refresh replaces the token with a new
/// one in the same family; presenting a token that was already used revokes the whole family,
/// because it means the token was copied (ADR 0011).
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; init; } = Guid.CreateVersion7();

    public Guid AccountId { get; init; }

    /// <summary>All tokens descended from one sign-in share a family id.</summary>
    public Guid FamilyId { get; init; }

    public required byte[] TokenHash { get; init; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset ExpiresAt { get; init; }

    public DateTimeOffset? UsedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
}
