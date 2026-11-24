using System.Net.Http.Headers;
using System.Net.Http.Json;
using Tjuvstart.SyncApi.Auth;
using Tjuvstart.SyncApi.Endpoints;

namespace Tjuvstart.SyncApi.Tests;

public static class SignedInClient
{
    /// <summary>Signs in a Google user and returns a client that sends their access token.</summary>
    public static async Task<(HttpClient Client, Session Session)> SignInAsync(this SyncApiFactory factory, string subject)
    {
        ArgumentNullException.ThrowIfNull(factory);
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            new Uri("/v1/auth/sign-in", UriKind.Relative),
            new SignInRequest("google", factory.Identity.GoogleToken(subject)));
        response.EnsureSuccessStatusCode();
        var session = (await response.Content.ReadFromJsonAsync<Session>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        return (client, session);
    }
}
