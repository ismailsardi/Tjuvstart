using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Tjuvstart.SyncApi.Tests;

/// <summary>Runs the API in memory with a known web client origin.</summary>
public sealed class SyncApiFactory : WebApplicationFactory<Program>
{
    public const string WebOrigin = "https://learner.example";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("WebClient:AllowedOrigins:0", WebOrigin);
    }
}
