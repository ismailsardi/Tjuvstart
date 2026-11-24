using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Tjuvstart.SyncApi.Auth;

namespace Tjuvstart.SyncApi.Tests;

/// <summary>
/// Stands in for Google and Apple: signs ID tokens with a local RSA key and serves that key as
/// the providers' OpenID configuration, so tests never call out to the real providers.
/// </summary>
public sealed class TestIdentityProvider : IOpenIdConfigurationSource, IDisposable
{
    public const string GoogleIssuer = "https://accounts.google.com";
    public const string AppleIssuer = "https://appleid.apple.com";
    public const string ClientId = "tjuvstart-web";

    private readonly RSA _rsa = RSA.Create(2048);
    private readonly RsaSecurityKey _key;

    public TestIdentityProvider()
    {
        _key = new RsaSecurityKey(_rsa) { KeyId = "test-key" };
    }

    public TimeProvider Clock { get; set; } = TimeProvider.System;

    public Task<OpenIdConnectConfiguration> GetAsync(string provider, CancellationToken cancellationToken)
    {
        var configuration = new OpenIdConnectConfiguration
        {
            Issuer = provider == "apple" ? AppleIssuer : GoogleIssuer,
        };
        configuration.SigningKeys.Add(_key);
        return Task.FromResult(configuration);
    }

    public string GoogleToken(string subject, string? email = null, bool emailVerified = true) =>
        IdToken(GoogleIssuer, subject, email, emailVerified);

    /// <summary>Signs an ID token. Every claim can be overridden to build invalid tokens.</summary>
    public string IdToken(
        string issuer,
        string subject,
        string? email = null,
        object? emailVerified = null,
        string audience = ClientId,
        TimeSpan? expiresIn = null,
        SecurityKey? signingKey = null)
    {
        var now = Clock.GetUtcNow().UtcDateTime;
        var claims = new Dictionary<string, object> { ["sub"] = subject };
        if (email is not null)
        {
            claims["email"] = email;
            claims["email_verified"] = emailVerified ?? true;
        }

        var lifetime = expiresIn ?? TimeSpan.FromHours(1);
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            Claims = claims,
            IssuedAt = now.AddHours(-2),
            NotBefore = now.AddHours(-2),
            Expires = now + lifetime,
            SigningCredentials = new SigningCredentials(signingKey ?? _key, SecurityAlgorithms.RsaSha256),
        });
    }

    public void Dispose() => _rsa.Dispose();
}
