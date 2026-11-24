using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tjuvstart.SyncApi.Endpoints;
using Tjuvstart.SyncApi.Sync;

namespace Tjuvstart.SyncApi.Tests;

/// <summary>Account deletion and data export: required by the app stores and by GDPR.</summary>
public sealed class AccountDataTests(PostgresFixture postgres) : ApiTest(postgres)
{
    [Fact]
    public async Task Deleting_the_account_removes_all_of_its_data()
    {
        var (learner, session) = await Factory.SignInAsync("learner");
        await PushAsync(learner, Change("cards", "c1", 1), Change("attempts", "a1", 1));
        var (other, _) = await Factory.SignInAsync("someone-else");
        await PushAsync(other, Change("cards", "c1", 1));

        var response = await learner.DeleteAsync(new Uri("/v1/account", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await using var db = Factory.CreateDbContext();
        Assert.False(await db.Accounts.AnyAsync(a => a.Id == session.AccountId));
        Assert.False(await db.ExternalIdentities.AnyAsync(i => i.AccountId == session.AccountId));
        Assert.False(await db.RefreshTokens.AnyAsync(t => t.AccountId == session.AccountId));
        Assert.False(await db.SyncRecords.AnyAsync(r => r.AccountId == session.AccountId));
        Assert.Equal(1, await db.SyncRecords.CountAsync());
    }

    [Fact]
    public async Task After_deletion_the_old_session_cannot_be_used()
    {
        var (learner, session) = await Factory.SignInAsync("learner");
        await learner.DeleteAsync(new Uri("/v1/account", UriKind.Relative));

        var refresh = await learner.PostAsJsonAsync(new Uri("/v1/auth/refresh", UriKind.Relative), new RefreshRequest(session.RefreshToken));
        var account = await learner.GetAsync(new Uri("/v1/account", UriKind.Relative));
        var push = await learner.PostAsJsonAsync(new Uri("/v1/sync/push", UriKind.Relative), new PushRequest { Changes = [Change("cards", "c1", 1)] });

        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, account.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, push.StatusCode);
    }

    [Fact]
    public async Task Signing_in_again_after_deletion_starts_a_new_account()
    {
        var (learner, first) = await Factory.SignInAsync("learner");
        await learner.DeleteAsync(new Uri("/v1/account", UriKind.Relative));

        var (_, second) = await Factory.SignInAsync("learner");

        Assert.True(second.IsNewAccount);
        Assert.NotEqual(first.AccountId, second.AccountId);
    }

    [Fact]
    public async Task Export_contains_the_account_and_every_synced_record()
    {
        var (learner, session) = await Factory.SignInAsync("learner");
        await PushAsync(learner, Change("cards", "jobb", 10), Change("reviews", "r1", 11), Change("completions", "gone", 12));
        await PushAsync(learner, new SyncChange { Collection = "completions", Key = "gone", UpdatedAt = 13, Deleted = true });

        var response = await learner.GetAsync(new Uri("/v1/account/export", UriKind.Relative));

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("tjuvstart-export-", response.Content.Headers.ContentDisposition?.FileName?.Trim('"'), StringComparison.Ordinal);
        var export = (await response.Content.ReadFromJsonAsync<AccountExport>())!;
        Assert.Equal(session.AccountId, export.AccountId);
        Assert.Equal("google", Assert.Single(export.Identities).Provider);
        Assert.Equal(SyncCollections.All.Keys.Order(), export.Collections.Keys.Order());
        Assert.Equal("jobb", Assert.Single(export.Collections["cards"]).Key);
        Assert.Equal(42, export.Collections["reviews"][0].Data.GetProperty("value").GetInt32());
        Assert.Empty(export.Collections["completions"]);
    }

    [Fact]
    public async Task Export_and_delete_need_a_signed_in_learner()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client.GetAsync(new Uri("/v1/account/export", UriKind.Relative))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client.DeleteAsync(new Uri("/v1/account", UriKind.Relative))).StatusCode);
    }

    private static SyncChange Change(string collection, string key, long updatedAt) => new()
    {
        Collection = collection,
        Key = key,
        UpdatedAt = updatedAt,
        Data = JsonSerializer.SerializeToElement(new { value = 42 }),
    };

    private static async Task PushAsync(HttpClient client, params SyncChange[] changes) =>
        (await client.PostAsJsonAsync(new Uri("/v1/sync/push", UriKind.Relative), new PushRequest { Changes = changes }))
            .EnsureSuccessStatusCode();
}
