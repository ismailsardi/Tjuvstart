namespace Tjuvstart.SyncApi.Tests;

/// <summary>Base for tests that call the API over HTTP. Every test gets a fresh API and database.</summary>
[Collection(ApiTestGroup.Name)]
public abstract class ApiTest(PostgresFixture postgres) : IAsyncLifetime
{
    protected SyncApiFactory Factory { get; } = new(postgres);

    protected HttpClient Client { get; private set; } = null!;

    public virtual Task InitializeAsync()
    {
        Client = Factory.CreateClient();
        return Task.CompletedTask;
    }

    public virtual async Task DisposeAsync()
    {
        Client.Dispose();
        await Factory.DisposeAsync();
    }
}
