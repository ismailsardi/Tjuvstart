using Npgsql;
using Testcontainers.PostgreSql;

namespace Tjuvstart.SyncApi.Tests;

/// <summary>
/// One PostgreSQL container for the whole test run. Each API instance gets its own database
/// in it, so tests never see each other's rows.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public string ConnectionStringForNewDatabase() =>
        new NpgsqlConnectionStringBuilder(_container.GetConnectionString())
        {
            Database = $"test_{Guid.NewGuid():N}",
        }.ConnectionString;

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

[CollectionDefinition(Name)]
public sealed class ApiTestGroup : ICollectionFixture<PostgresFixture>
{
    public const string Name = "api";
}
