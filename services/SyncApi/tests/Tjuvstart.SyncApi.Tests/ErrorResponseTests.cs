using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;

namespace Tjuvstart.SyncApi.Tests;

public sealed class ErrorResponseTests(PostgresFixture postgres) : ApiTest(postgres)
{
    [Fact]
    public async Task Unknown_route_returns_problem_details()
    {
        var response = await Client.GetAsync(new Uri("/v1/does-not-exist", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(404, problem?.Status);
    }

    [Fact]
    public async Task Wrong_method_returns_problem_details()
    {
        var response = await Client.DeleteAsync(new Uri("/v1/info", UriKind.Relative));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
