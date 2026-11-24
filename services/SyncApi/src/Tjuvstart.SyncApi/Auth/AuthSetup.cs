using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Tjuvstart.SyncApi.Auth;

public static class AuthSetup
{
    /// <summary>Rate limit policy for the sign-in and refresh endpoints.</summary>
    public const string AuthRateLimit = "auth";

    public static IServiceCollection AddSyncAuth(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<AuthOptions>()
            .Bind(configuration.GetSection(AuthOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.TryAddSingleton(TimeProvider.System);
        services.AddHttpClient(nameof(DiscoveryConfigurationSource));
        services.AddSingleton<IOpenIdConfigurationSource, DiscoveryConfigurationSource>();
        services.AddSingleton<IdTokenValidator>();
        services.AddSingleton<AccessTokenIssuer>();
        services.AddScoped<SessionService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<AuthOptions>>((bearer, auth) =>
            {
                bearer.MapInboundClaims = false;
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = auth.Value.Issuer,
                    ValidAudience = AuthOptions.Audience,
                    IssuerSigningKey = AccessTokenIssuer.SigningKey(auth.Value),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    NameClaimType = "sub",
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });
        services.AddAuthorization();

        // Sign-in and refresh are the only anonymous endpoints that do real work, so they get a
        // per-client limit. Behind a proxy this relies on forwarded headers for the client address.
        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.AddPolicy(AuthRateLimit, http => RateLimitPartition.GetFixedWindowLimiter(
                http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
        });

        return services;
    }
}
