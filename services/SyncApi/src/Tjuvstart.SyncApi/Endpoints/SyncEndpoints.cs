using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Tjuvstart.SyncApi.Sync;

namespace Tjuvstart.SyncApi.Endpoints;

public static class SyncEndpoints
{
    public static RouteGroupBuilder MapSyncEndpoints(this RouteGroupBuilder group)
    {
        var sync = group.MapGroup("/sync").RequireAuthorization().WithTags("Sync");

        sync.MapPost("/push", PushAsync)
            .WithName("Push")
            .WithSummary("Uploads local changes. Safe to retry: changes the server already has are ignored.");

        sync.MapGet("/pull", PullAsync)
            .WithName("Pull")
            .WithSummary("Returns changes after the given cursor, oldest first.");

        return group;
    }

    private static async Task<Ok<PushResponse>> PushAsync(
        PushRequest request, ClaimsPrincipal user, SyncService sync, CancellationToken cancellationToken) =>
        TypedResults.Ok(await sync.PushAsync(user.AccountId(), request.Changes, cancellationToken));

    private static async Task<Ok<PullResponse>> PullAsync(
        ClaimsPrincipal user,
        SyncService sync,
        CancellationToken cancellationToken,
        [Range(0, long.MaxValue)] long after = 0,
        [Range(1, SyncService.MaxPullLimit)] int limit = SyncService.MaxPullLimit) =>
        TypedResults.Ok(await sync.PullAsync(user.AccountId(), after, limit, cancellationToken));
}
