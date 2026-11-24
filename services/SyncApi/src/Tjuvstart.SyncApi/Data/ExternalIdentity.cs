namespace Tjuvstart.SyncApi.Data;

/// <summary>
/// A sign-in identity from a provider such as Google or Apple, identified by the provider's
/// stable subject id. An account can have several, one per provider.
/// </summary>
public sealed class ExternalIdentity
{
    public const int ProviderMaxLength = 32;
    public const int SubjectMaxLength = 255;
    public const int EmailMaxLength = 320;

    public Guid Id { get; init; } = Guid.CreateVersion7();

    public Guid AccountId { get; init; }

    public required string Provider { get; init; }

    public required string Subject { get; init; }

    /// <summary>
    /// The e-mail address the provider reported, kept only so the learner can see which login
    /// is linked. It can be an Apple private relay address, and it is never used as a key.
    /// </summary>
    public string? Email { get; set; }

    public DateTimeOffset CreatedAt { get; init; }
}
