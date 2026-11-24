using System.Reflection;

namespace Tjuvstart.SyncApi.Endpoints;

/// <summary>Service name and version, so the web client can check it talks to a compatible API.</summary>
public sealed record ApiInfo(string Service, string Version);

public static class InfoEndpoints
{
    private static readonly ApiInfo Info = new(
        "tjuvstart-sync",
        typeof(InfoEndpoints).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            .Split('+')[0] ?? "0.0.0");

    public static RouteGroupBuilder MapInfoEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/info", () => TypedResults.Ok(Info))
            .WithName("GetInfo")
            .WithSummary("Returns the service name and version.");

        return group;
    }
}
