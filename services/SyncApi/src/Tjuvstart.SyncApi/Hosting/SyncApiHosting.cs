using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Tjuvstart.SyncApi.Data;
using Tjuvstart.SyncApi.Endpoints;

namespace Tjuvstart.SyncApi.Hosting;

public static class SyncApiHosting
{
    public const string WebClientCorsPolicy = "WebClient";
    private const string ReadyTag = "ready";

    public static IServiceCollection AddSyncApi(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddOptions<WebClientOptions>()
            .Bind(configuration.GetSection(WebClientOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddCors();
        services.AddOptions<CorsOptions>()
            .Configure<IOptions<WebClientOptions>>((cors, webClient) =>
                cors.AddPolicy(WebClientCorsPolicy, policy => policy
                    .WithOrigins(webClient.Value.AllowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .SetPreflightMaxAge(TimeSpan.FromHours(1))));

        services.AddProblemDetails();
        services.AddSyncDatabase(configuration);
        services.AddHealthChecks()
            .AddDbContextCheck<SyncDbContext>("database", tags: [ReadyTag]);
        services.AddOpenApi();

        return services;
    }

    public static WebApplication UseSyncApi(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        // Unhandled exceptions and bare status codes (404, 405, ...) are returned as RFC 9457
        // problem details, so the web client only has one error format to handle.
        app.UseExceptionHandler();
        app.UseStatusCodePages();

        app.UseCors(WebClientCorsPolicy);

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        // Liveness never touches the database, so a slow or paused free-tier database does not
        // make the host restart the API. Readiness includes it.
        app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false });
        app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = c => c.Tags.Contains(ReadyTag) });
        app.MapGroup("/v1").MapInfoEndpoints();

        return app;
    }
}
