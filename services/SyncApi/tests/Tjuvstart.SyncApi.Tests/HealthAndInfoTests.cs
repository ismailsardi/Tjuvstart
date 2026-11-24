using System.Net;
using System.Net.Http.Json;
using Tjuvstart.SyncApi.Endpoints;

namespace Tjuvstart.SyncApi.Tests;

public sealed class HealthAndInfoTests(SyncApiFactory factory) : IClassFixture<SyncApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Health_reports_healthy()
    {
        var response = await _client.GetAsync(new Uri("/health", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Info_returns_the_service_name_and_version()
    {
        var info = await _client.GetFromJsonAsync<ApiInfo>(new Uri("/v1/info", UriKind.Relative));

        Assert.NotNull(info);
        Assert.Equal("tjuvstart-sync", info.Service);
        Assert.Equal("0.1.0", info.Version);
    }
}
