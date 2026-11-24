using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Tjuvstart.SyncApi.Auth;

public sealed record AccessToken(string Token, DateTimeOffset ExpiresAt);

/// <summary>Issues the API's own short-lived access tokens after sign-in or refresh.</summary>
public sealed class AccessTokenIssuer(IOptions<AuthOptions> options, TimeProvider timeProvider)
{
    private readonly JsonWebTokenHandler _handler = new();

    public AccessToken Issue(Guid accountId)
    {
        var settings = options.Value;
        var now = timeProvider.GetUtcNow();
        var expires = now + settings.AccessTokenLifetime;

        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = AuthOptions.Audience,
            Subject = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, accountId.ToString())]),
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expires.UtcDateTime,
            SigningCredentials = new SigningCredentials(SigningKey(settings), SecurityAlgorithms.HmacSha256),
        });

        return new AccessToken(token, expires);
    }

    public static SymmetricSecurityKey SigningKey(AuthOptions settings) =>
        new(Encoding.UTF8.GetBytes(settings.SigningKey));
}
