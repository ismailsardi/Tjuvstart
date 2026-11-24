using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Tjuvstart.SyncApi.Data;

public static class DatabaseSetup
{
    public const string ConnectionStringName = "Sync";

    public static IServiceCollection AddSyncDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is missing. Set ConnectionStrings__{ConnectionStringName}.");
        }

        services.AddDbContext<SyncDbContext>(options => options.UseNpgsql(connectionString));
        services.AddOptions<DatabaseOptions>().Bind(configuration.GetSection(DatabaseOptions.SectionName));

        return services;
    }

    public static async Task MigrateIfConfiguredAsync(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        if (!app.Services.GetRequiredService<IOptions<DatabaseOptions>>().Value.MigrateOnStartup)
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SyncDbContext>();
        await db.Database.MigrateAsync();
    }
}
