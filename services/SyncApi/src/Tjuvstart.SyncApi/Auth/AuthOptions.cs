using System.ComponentModel.DataAnnotations;

namespace Tjuvstart.SyncApi.Auth;

public sealed class AuthOptions : IValidatableObject
{
    public const string SectionName = "Auth";
    public const string Audience = "tjuvstart-sync";

    /// <summary>Secret for signing access tokens (HMAC-SHA256). At least 32 characters; keep it out of source control.</summary>
    [Required, MinLength(32)]
    public string SigningKey { get; set; } = "";

    [Required]
    public string Issuer { get; set; } = "tjuvstart-sync";

    public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromMinutes(15);

    public TimeSpan RefreshTokenLifetime { get; set; } = TimeSpan.FromDays(60);

    /// <summary>Identity providers learners can sign in with, keyed by name (for example <c>google</c>).</summary>
    public Dictionary<string, IdentityProviderOptions> Providers { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (AccessTokenLifetime <= TimeSpan.Zero || RefreshTokenLifetime <= AccessTokenLifetime)
        {
            yield return new ValidationResult("Token lifetimes must be positive, and refresh tokens must outlive access tokens.");
        }

        foreach (var (name, provider) in Providers)
        {
            if (!Uri.TryCreate(provider.Authority, UriKind.Absolute, out var authority) || authority.Scheme != Uri.UriSchemeHttps)
            {
                yield return new ValidationResult($"Auth:Providers:{name}:Authority must be an https URL.");
            }

            if (provider.ClientIds.Length == 0)
            {
                yield return new ValidationResult($"Auth:Providers:{name}:ClientIds needs at least one client id.");
            }
        }
    }
}

/// <summary>An OpenID Connect provider whose ID tokens the API accepts.</summary>
public sealed class IdentityProviderOptions
{
    /// <summary>The provider's issuer URL. Its discovery document lists the signing keys.</summary>
    public string Authority { get; set; } = "";

    /// <summary>
    /// Extra accepted values for the token's <c>iss</c> claim. Google, for example, also issues
    /// tokens with <c>accounts.google.com</c> without the scheme.
    /// </summary>
    public string[] AdditionalIssuers { get; set; } = [];

    /// <summary>OAuth client ids registered for Tjuvstart; a token must be issued to one of them.</summary>
    public string[] ClientIds { get; set; } = [];
}
