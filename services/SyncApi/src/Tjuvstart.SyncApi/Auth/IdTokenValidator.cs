using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Tjuvstart.SyncApi.Auth;

/// <summary>Who the provider says the learner is, taken from a validated ID token.</summary>
public sealed record VerifiedIdentity(string Provider, string Subject, string? Email);

/// <summary>Validates ID tokens from the configured OpenID Connect providers (Google, Apple, ...).</summary>
public sealed class IdTokenValidator(
    IOptions<AuthOptions> options,
    IOpenIdConfigurationSource configurationSource,
    TimeProvider timeProvider)
{
    private readonly JsonWebTokenHandler _handler = new() { MapInboundClaims = false };

    public bool IsKnownProvider(string provider) => options.Value.Providers.ContainsKey(provider);

    /// <returns>The identity, or <c>null</c> when the token is not valid for that provider.</returns>
    public async Task<VerifiedIdentity?> ValidateAsync(string provider, string idToken, CancellationToken cancellationToken)
    {
        if (!options.Value.Providers.TryGetValue(provider, out var settings))
        {
            return null;
        }

        var configuration = await configurationSource.GetAsync(provider, cancellationToken);
        var parameters = new TokenValidationParameters
        {
            ValidIssuers = [configuration.Issuer ?? settings.Authority, settings.Authority, .. settings.AdditionalIssuers],
            ValidAudiences = settings.ClientIds,
            IssuerSigningKeys = configuration.SigningKeys,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            LifetimeValidator = (notBefore, expires, _, p) => IsWithinLifetime(notBefore, expires, p.ClockSkew),
        };

        var result = await _handler.ValidateTokenAsync(idToken, parameters);
        if (!result.IsValid || result.SecurityToken is not JsonWebToken token || string.IsNullOrEmpty(token.Subject))
        {
            return null;
        }

        return new VerifiedIdentity(provider.ToLowerInvariant(), token.Subject, VerifiedEmail(token));
    }

    private bool IsWithinLifetime(DateTime? notBefore, DateTime? expires, TimeSpan skew)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        return expires is { } exp && now < exp + skew && (notBefore is not { } nbf || now >= nbf - skew);
    }

    // Apple sends email_verified as the string "true", Google as a boolean.
    private static string? VerifiedEmail(JsonWebToken token) =>
        token.TryGetPayloadValue<string>("email", out var email)
        && token.TryGetPayloadValue<object>("email_verified", out var verified)
        && string.Equals(verified?.ToString(), "true", StringComparison.OrdinalIgnoreCase)
            ? email
            : null;
}
