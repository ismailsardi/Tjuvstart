using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Tjuvstart.SyncApi.Auth;

/// <summary>Supplies a provider's OpenID configuration, most importantly its current signing keys.</summary>
public interface IOpenIdConfigurationSource
{
    Task<OpenIdConnectConfiguration> GetAsync(string provider, CancellationToken cancellationToken);
}

/// <summary>
/// Reads each provider's discovery document and caches it. <see cref="ConfigurationManager{T}"/>
/// refreshes the keys periodically and when a token is signed with a key it has not seen.
/// </summary>
public sealed class DiscoveryConfigurationSource(IOptions<AuthOptions> options, IHttpClientFactory httpClientFactory)
    : IOpenIdConfigurationSource
{
    private readonly ConcurrentDictionary<string, ConfigurationManager<OpenIdConnectConfiguration>> _managers =
        new(StringComparer.OrdinalIgnoreCase);

    public Task<OpenIdConnectConfiguration> GetAsync(string provider, CancellationToken cancellationToken)
    {
        var manager = _managers.GetOrAdd(provider, name =>
        {
            var authority = options.Value.Providers[name].Authority.TrimEnd('/');
            return new ConfigurationManager<OpenIdConnectConfiguration>(
                $"{authority}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever(httpClientFactory.CreateClient(nameof(DiscoveryConfigurationSource))));
        });

        return manager.GetConfigurationAsync(cancellationToken);
    }
}
