using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;
using Tjuvstart.SyncApi.Endpoints;

namespace Tjuvstart.SyncApi.Hosting;

public static class SyncApiHosting
{
    public const string WebClientCorsPolicy = "WebClient";

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
        services.AddHealthChecks();
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

        app.MapHealthChecks("/health");
        app.MapGroup("/v1").MapInfoEndpoints();

        return app;
    }
}
