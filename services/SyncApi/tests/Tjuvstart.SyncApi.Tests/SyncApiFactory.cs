using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Tjuvstart.SyncApi.Auth;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Tests;

/// <summary>Runs the API in memory against a fresh PostgreSQL database, with a known web client origin.</summary>
public class SyncApiFactory(PostgresFixture postgres) : WebApplicationFactory<Program>
{
    public const string WebOrigin = "https://learner.example";

    public string ConnectionString { get; } = postgres.ConnectionStringForNewDatabase();

    /// <summary>The API's clock. It starts at the real time, so access tokens also pass JWT bearer validation.</summary>
    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.UtcNow);

    public TestIdentityProvider Identity { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("WebClient:AllowedOrigins:0", WebOrigin);
        builder.UseSetting($"ConnectionStrings:{DatabaseSetup.ConnectionStringName}", ConnectionString);
        builder.UseSetting("Database:MigrateOnStartup", "true");
        builder.UseSetting("Auth:SigningKey", "test-signing-key-at-least-32-characters-long");
        builder.UseSetting("Auth:Providers:google:Authority", TestIdentityProvider.GoogleIssuer);
        builder.UseSetting("Auth:Providers:google:AdditionalIssuers:0", "accounts.google.com");
        builder.UseSetting("Auth:Providers:google:ClientIds:0", TestIdentityProvider.ClientId);
        builder.UseSetting("Auth:Providers:apple:Authority", TestIdentityProvider.AppleIssuer);
        builder.UseSetting("Auth:Providers:apple:ClientIds:0", TestIdentityProvider.ClientId);

        Identity.Clock = Clock;
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOpenIdConfigurationSource>();
            services.AddSingleton<IOpenIdConfigurationSource>(Identity);
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    /// <summary>Runs <paramref name="work"/> with a database context from the API's own container.</summary>
    public async Task WithDbAsync(Func<SyncDbContext, Task> work)
    {
        ArgumentNullException.ThrowIfNull(work);
        await using var scope = Services.CreateAsyncScope();
        await work(scope.ServiceProvider.GetRequiredService<SyncDbContext>());
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            Identity.Dispose();
        }

        base.Dispose(disposing);
    }

    public SyncDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<SyncDbContext>().UseNpgsql(ConnectionString).Options);
}
