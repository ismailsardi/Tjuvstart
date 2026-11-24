namespace Tjuvstart.SyncApi.Data;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>
    /// Apply pending EF Core migrations when the API starts. Convenient on a single small
    /// instance; turn it off if migrations are run as a separate deployment step.
    /// </summary>
    public bool MigrateOnStartup { get; set; }
}
