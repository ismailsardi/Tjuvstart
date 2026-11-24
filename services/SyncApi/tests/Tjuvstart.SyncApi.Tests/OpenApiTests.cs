using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace Tjuvstart.SyncApi.Tests;

public sealed class OpenApiTests
{
    [Fact]
    public async Task Document_is_served_in_development()
    {
        await using var factory = new SyncApiFactory().WithWebHostBuilder(b => b.UseEnvironment("Development"));
        using var client = factory.CreateClient();

        var json = await client.GetStringAsync(new Uri("/openapi/v1.json", UriKind.Relative));

        using var document = JsonDocument.Parse(json);
        Assert.True(document.RootElement.GetProperty("paths").TryGetProperty("/v1/info", out _));
    }

    [Fact]
    public async Task Document_is_not_served_outside_development()
    {
        await using var factory = new SyncApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/openapi/v1.json", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
