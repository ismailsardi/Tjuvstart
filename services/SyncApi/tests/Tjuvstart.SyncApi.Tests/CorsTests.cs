using System.Net;

namespace Tjuvstart.SyncApi.Tests;

public sealed class CorsTests(SyncApiFactory factory) : IClassFixture<SyncApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Preflight_from_the_web_client_is_allowed()
    {
        using var response = await _client.SendAsync(Preflight(SyncApiFactory.WebOrigin));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(SyncApiFactory.WebOrigin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task Preflight_from_another_origin_gets_no_cors_headers()
    {
        using var response = await _client.SendAsync(Preflight("https://evil.example"));

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private static HttpRequestMessage Preflight(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, new Uri("/v1/info", UriKind.Relative));
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");
        return request;
    }
}
