using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Tjuvstart.SyncApi.Auth;
using Tjuvstart.SyncApi.Endpoints;

namespace Tjuvstart.SyncApi.Tests;

public sealed class AuthTests(PostgresFixture postgres) : ApiTest(postgres)
{
    private TestIdentityProvider Idp => Factory.Identity;

    [Fact]
    public async Task First_sign_in_creates_an_account_and_later_ones_reuse_it()
    {
        var first = await SignInAsync("google", Idp.GoogleToken("google-user-1"));
        var second = await SignInAsync("google", Idp.GoogleToken("google-user-1"));

        Assert.True(first.IsNewAccount);
        Assert.False(second.IsNewAccount);
        Assert.Equal(first.AccountId, second.AccountId);
        await using var db = Factory.CreateDbContext();
        Assert.Equal(1, await db.Accounts.CountAsync());
    }

    [Fact]
    public async Task The_same_subject_at_another_provider_is_another_account()
    {
        var google = await SignInAsync("google", Idp.GoogleToken("same-id"));
        var apple = await SignInAsync("apple", Idp.IdToken(TestIdentityProvider.AppleIssuer, "same-id"));

        Assert.NotEqual(google.AccountId, apple.AccountId);
    }

    [Fact]
    public async Task The_access_token_opens_the_account_endpoint()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1", "kari@example.com"));

        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/v1/account", UriKind.Relative));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var response = await Client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var account = await response.Content.ReadFromJsonAsync<AccountResponse>();
        Assert.Equal(session.AccountId, account?.AccountId);
        Assert.Equal(new LinkedIdentity("google", "kari@example.com"), Assert.Single(account!.Identities));
    }

    [Fact]
    public async Task The_account_endpoint_needs_a_token()
    {
        var response = await Client.GetAsync(new Uri("/v1/account", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task An_unverified_email_is_not_stored()
    {
        await SignInAsync("google", Idp.GoogleToken("google-user-1", "someone@example.com", emailVerified: false));

        await using var db = Factory.CreateDbContext();
        Assert.Null((await db.ExternalIdentities.SingleAsync()).Email);
    }

    [Fact]
    public async Task Apple_email_is_kept_when_later_tokens_leave_it_out()
    {
        // Apple sends email_verified as a string, and the e-mail only on the first sign-in.
        await SignInAsync("apple", Idp.IdToken(TestIdentityProvider.AppleIssuer, "apple-1", "x@privaterelay.appleid.com", "true"));
        await SignInAsync("apple", Idp.IdToken(TestIdentityProvider.AppleIssuer, "apple-1"));

        await using var db = Factory.CreateDbContext();
        Assert.Equal("x@privaterelay.appleid.com", (await db.ExternalIdentities.SingleAsync()).Email);
    }

    public static TheoryData<string> InvalidTokens() => new()
    {
        "wrong-key",
        "wrong-audience",
        "wrong-issuer",
        "expired",
        "not-a-jwt",
    };

    [Theory]
    [MemberData(nameof(InvalidTokens))]
    public async Task Invalid_id_tokens_are_rejected(string kind)
    {
        using var otherRsa = RSA.Create(2048);
        var token = kind switch
        {
            "wrong-key" => Idp.IdToken(TestIdentityProvider.GoogleIssuer, "u", signingKey: new RsaSecurityKey(otherRsa) { KeyId = "test-key" }),
            "wrong-audience" => Idp.IdToken(TestIdentityProvider.GoogleIssuer, "u", audience: "someone-elses-app"),
            "wrong-issuer" => Idp.IdToken("https://evil.example", "u"),
            "expired" => Idp.IdToken(TestIdentityProvider.GoogleIssuer, "u", expiresIn: TimeSpan.FromMinutes(-5)),
            _ => "not-a-jwt",
        };

        var response = await PostAsync("/v1/auth/sign-in", new SignInRequest("google", token));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await using var db = Factory.CreateDbContext();
        Assert.False(await db.Accounts.AnyAsync());
    }

    [Fact]
    public async Task Google_tokens_with_the_schemeless_issuer_are_accepted()
    {
        var session = await SignInAsync("google", Idp.IdToken("accounts.google.com", "google-user-1"));

        Assert.True(session.IsNewAccount);
    }

    [Fact]
    public async Task An_unknown_provider_is_a_validation_error()
    {
        var response = await PostAsync("/v1/auth/sign-in", new SignInRequest("facebook", Idp.GoogleToken("u")));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        Assert.Contains("Provider", problem!.Errors.Keys);
    }

    [Fact]
    public async Task A_missing_id_token_is_a_validation_error()
    {
        var response = await Client.PostAsJsonAsync(new Uri("/v1/auth/sign-in", UriKind.Relative), new { provider = "google" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        Assert.Contains(problem!.Errors.Keys, k => k.Equals("IdToken", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Refresh_rotates_both_tokens()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1"));

        var refreshed = await RefreshAsync(session.RefreshToken);

        Assert.Equal(session.AccountId, refreshed.AccountId);
        Assert.NotEqual(session.RefreshToken, refreshed.RefreshToken);
        Assert.False(refreshed.IsNewAccount);
    }

    [Fact]
    public async Task Reusing_a_refresh_token_revokes_the_session()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1"));
        var refreshed = await RefreshAsync(session.RefreshToken);

        var reuse = await PostAsync("/v1/auth/refresh", new RefreshRequest(session.RefreshToken));
        var afterReuse = await PostAsync("/v1/auth/refresh", new RefreshRequest(refreshed.RefreshToken));

        Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, afterReuse.StatusCode);
    }

    [Fact]
    public async Task Concurrent_refreshes_with_one_token_issue_at_most_one_session()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1"));

        var responses = await Task.WhenAll(Enumerable.Range(0, 5)
            .Select(_ => PostAsync("/v1/auth/refresh", new RefreshRequest(session.RefreshToken))));

        Assert.True(responses.Count(r => r.IsSuccessStatusCode) <= 1);
    }

    [Fact]
    public async Task Refresh_tokens_expire()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1"));

        Factory.Clock.Advance(TimeSpan.FromDays(61));
        var response = await PostAsync("/v1/auth/refresh", new RefreshRequest(session.RefreshToken));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Sign_out_revokes_the_refresh_token()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1"));

        var signOut = await PostAsync("/v1/auth/sign-out", new RefreshRequest(session.RefreshToken));
        var refresh = await PostAsync("/v1/auth/refresh", new RefreshRequest(session.RefreshToken));

        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task Refresh_tokens_are_stored_hashed()
    {
        var session = await SignInAsync("google", Idp.GoogleToken("google-user-1"));

        await using var db = Factory.CreateDbContext();
        var stored = await db.RefreshTokens.SingleAsync();
        Assert.Equal(SessionService.Hash(session.RefreshToken), stored.TokenHash);
    }

    private async Task<Session> SignInAsync(string provider, string idToken)
    {
        var response = await PostAsync("/v1/auth/sign-in", new SignInRequest(provider, idToken));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Session>())!;
    }

    private async Task<Session> RefreshAsync(string refreshToken)
    {
        var response = await PostAsync("/v1/auth/refresh", new RefreshRequest(refreshToken));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Session>())!;
    }

    private Task<HttpResponseMessage> PostAsync<T>(string path, T body) =>
        Client.PostAsJsonAsync(new Uri(path, UriKind.Relative), body);
}
