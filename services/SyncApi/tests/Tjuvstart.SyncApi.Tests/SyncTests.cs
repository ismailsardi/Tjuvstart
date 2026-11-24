using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Tjuvstart.SyncApi.Sync;

namespace Tjuvstart.SyncApi.Tests;

public sealed class SyncTests(PostgresFixture postgres) : ApiTest(postgres)
{
    private HttpClient _learner = null!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        _learner = (await Factory.SignInAsync("learner")).Client;
    }

    public override async Task DisposeAsync()
    {
        _learner.Dispose();
        await base.DisposeAsync();
    }

    [Fact]
    public async Task Pushed_changes_come_back_on_pull_in_order()
    {
        var push = await PushAsync(_learner,
            Change("cards", "jobb", 1_000, new { interval = 1, due = 86_400_000 }),
            Change("attempts", "0b0e5c9e-1", 1_001, new { itemId = "g1", correct = true }));

        var pull = await PullAsync(_learner, after: 0);

        Assert.Equal(new PushResponse(2, 0, 2), push);
        Assert.Equal(["cards/jobb", "attempts/0b0e5c9e-1"], pull.Changes.Select(c => $"{c.Collection}/{c.Key}"));
        Assert.Equal([1L, 2L], pull.Changes.Select(c => c.Sequence));
        Assert.Equal(1, pull.Changes[0].Data!.Value.GetProperty("interval").GetInt32());
        Assert.Equal(2, pull.Cursor);
        Assert.False(pull.HasMore);
    }

    [Fact]
    public async Task Pull_only_returns_changes_after_the_cursor()
    {
        await PushAsync(_learner, Change("cards", "a", 1, new { }));
        var first = await PullAsync(_learner, after: 0);
        await PushAsync(_learner, Change("cards", "b", 2, new { }));

        var second = await PullAsync(_learner, after: first.Cursor);

        Assert.Equal("b", Assert.Single(second.Changes).Key);
    }

    [Fact]
    public async Task Pull_pages_through_large_histories()
    {
        await PushAsync(_learner, Enumerable.Range(0, 5).Select(i => Change("reviews", $"r{i}", i, new { grade = 3 })).ToArray());

        var page1 = await PullAsync(_learner, after: 0, limit: 3);
        var page2 = await PullAsync(_learner, after: page1.Cursor, limit: 3);

        Assert.True(page1.HasMore);
        Assert.False(page2.HasMore);
        Assert.Equal(5, page1.Changes.Count + page2.Changes.Count);
    }

    [Fact]
    public async Task Repeating_a_push_changes_nothing()
    {
        var changes = new[] { Change("attempts", "a1", 5, new { correct = true }), Change("cards", "c1", 5, new { reps = 1 }) };
        await PushAsync(_learner, changes);

        var again = await PushAsync(_learner, changes);

        Assert.Equal(new PushResponse(0, 2, 2), again);
    }

    [Fact]
    public async Task Log_entries_are_never_overwritten()
    {
        await PushAsync(_learner, Change("attempts", "a1", 5, new { correct = true }));

        await PushAsync(_learner, Change("attempts", "a1", 9, new { correct = false }));

        var stored = Assert.Single((await PullAsync(_learner, 0)).Changes);
        Assert.True(stored.Data!.Value.GetProperty("correct").GetBoolean());
    }

    [Fact]
    public async Task The_newer_version_of_a_state_record_wins()
    {
        await PushAsync(_learner, Change("cards", "c1", 200, new { reps = 2 }));

        var older = await PushAsync(_learner, Change("cards", "c1", 100, new { reps = 1 }));
        var newer = await PushAsync(_learner, Change("cards", "c1", 300, new { reps = 3 }));

        Assert.Equal(1, older.Ignored);
        Assert.Equal(1, newer.Accepted);
        var stored = Assert.Single((await PullAsync(_learner, 0)).Changes);
        Assert.Equal(3, stored.Data!.Value.GetProperty("reps").GetInt32());
        Assert.Equal(newer.Cursor, stored.Sequence);
    }

    [Fact]
    public async Task A_deleted_state_record_is_pulled_as_a_tombstone()
    {
        await PushAsync(_learner, Change("completions", "lesson-1", 1, new { bestScore = 8 }));

        await PushAsync(_learner, new SyncChange { Collection = "completions", Key = "lesson-1", UpdatedAt = 2, Deleted = true });

        var stored = Assert.Single((await PullAsync(_learner, 0)).Changes);
        Assert.True(stored.Deleted);
        Assert.Null(stored.Data);
    }

    [Fact]
    public async Task Learners_only_see_their_own_records()
    {
        await PushAsync(_learner, Change("cards", "c1", 1, new { reps = 1 }));
        using var other = (await Factory.SignInAsync("someone-else")).Client;

        var pull = await PullAsync(other, 0);

        Assert.Empty(pull.Changes);
        Assert.Equal(0, pull.Cursor);
    }

    [Fact]
    public async Task Concurrent_pushes_get_distinct_sequence_numbers()
    {
        await Task.WhenAll(Enumerable.Range(0, 8).Select(i =>
            PushAsync(_learner, Change("reviews", $"r{i}", i, new { grade = 4 }))));

        var pull = await PullAsync(_learner, 0);

        Assert.Equal(Enumerable.Range(1, 8).Select(i => (long)i), pull.Changes.Select(c => c.Sequence));
    }

    public static TheoryData<string, string> InvalidChanges() => new()
    {
        { """{"collection":"aiSettings","key":"ai","updatedAt":1,"data":{"apiKey":"sk-..."}}""", "Collection" },
        { """{"collection":"attempts","key":"a1","updatedAt":1,"deleted":true}""", "Deleted" },
        { """{"collection":"cards","key":"c1","updatedAt":1,"data":[1,2]}""", "Data" },
        { """{"collection":"cards","key":"c1","updatedAt":1}""", "Data" },
        { """{"collection":"cards","key":"c1","updatedAt":-1,"data":{}}""", "UpdatedAt" },
    };

    [Theory]
    [MemberData(nameof(InvalidChanges))]
    public async Task Invalid_changes_are_rejected(string change, string field)
    {
        using var content = new StringContent($$"""{"changes":[{{change}}]}""", System.Text.Encoding.UTF8, "application/json");
        var response = await _learner.PostAsync(new Uri("/v1/sync/push", UriKind.Relative), content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        Assert.Contains(problem!.Errors.Keys, k => k.EndsWith(field, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task A_push_over_the_batch_limit_is_rejected()
    {
        var changes = Enumerable.Range(0, PushRequest.MaxChanges + 1).Select(i => Change("reviews", $"r{i}", i, new { })).ToArray();

        var response = await _learner.PostAsJsonAsync(new Uri("/v1/sync/push", UriKind.Relative), new PushRequest { Changes = changes });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Sync_needs_a_signed_in_learner()
    {
        var response = await Client.GetAsync(new Uri("/v1/sync/pull", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static SyncChange Change(string collection, string key, long updatedAt, object data) => new()
    {
        Collection = collection,
        Key = key,
        UpdatedAt = updatedAt,
        Data = JsonSerializer.SerializeToElement(data),
    };

    private static async Task<PushResponse> PushAsync(HttpClient client, params SyncChange[] changes)
    {
        var response = await client.PostAsJsonAsync(new Uri("/v1/sync/push", UriKind.Relative), new PushRequest { Changes = changes });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PushResponse>())!;
    }

    private static async Task<PullResponse> PullAsync(HttpClient client, long after, int limit = 500) =>
        (await client.GetFromJsonAsync<PullResponse>(new Uri($"/v1/sync/pull?after={after}&limit={limit}", UriKind.Relative)))!;
}
