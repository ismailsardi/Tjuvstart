using System.Net;
using System.Net.Http.Json;
using Tjuvstart.SyncApi.Endpoints;

namespace Tjuvstart.SyncApi.Tests;

public sealed class HealthAndInfoTests(PostgresFixture postgres) : ApiTest(postgres)
{
    [Fact]
    public async Task Health_reports_healthy()
    {
        var response = await Client.GetAsync(new Uri("/health", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Readiness_checks_the_database()
    {
        var response = await Client.GetAsync(new Uri("/health/ready", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Info_returns_the_service_name_and_version()
    {
        var info = await Client.GetFromJsonAsync<ApiInfo>(new Uri("/v1/info", UriKind.Relative));

        Assert.NotNull(info);
        Assert.Equal("tjuvstart-sync", info.Service);
        Assert.Equal("0.1.0", info.Version);
    }
}
