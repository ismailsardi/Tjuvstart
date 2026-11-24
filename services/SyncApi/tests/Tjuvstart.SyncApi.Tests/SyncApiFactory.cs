using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Tests;

/// <summary>Runs the API in memory against a fresh PostgreSQL database, with a known web client origin.</summary>
public class SyncApiFactory(PostgresFixture postgres) : WebApplicationFactory<Program>
{
    public const string WebOrigin = "https://learner.example";

    public string ConnectionString { get; } = postgres.ConnectionStringForNewDatabase();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("WebClient:AllowedOrigins:0", WebOrigin);
        builder.UseSetting($"ConnectionStrings:{DatabaseSetup.ConnectionStringName}", ConnectionString);
        builder.UseSetting("Database:MigrateOnStartup", "true");
    }

    /// <summary>Runs <paramref name="work"/> with a database context from the API's own container.</summary>
    public async Task WithDbAsync(Func<SyncDbContext, Task> work)
    {
        ArgumentNullException.ThrowIfNull(work);
        await using var scope = Services.CreateAsyncScope();
        await work(scope.ServiceProvider.GetRequiredService<SyncDbContext>());
    }

    public SyncDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<SyncDbContext>().UseNpgsql(ConnectionString).Options);
}
