using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Tjuvstart.SyncApi.Auth;

namespace Tjuvstart.SyncApi.Endpoints;

public sealed record SignInRequest(
    [property: Required, MaxLength(32)] string Provider,
    [property: Required, MaxLength(8192)] string IdToken);

public sealed record RefreshRequest([property: Required, MaxLength(128)] string RefreshToken);

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        var auth = group.MapGroup("/auth")
            .WithTags("Auth")
            .RequireRateLimiting(AuthSetup.AuthRateLimit);

        auth.MapPost("/sign-in", SignInAsync)
            .WithName("SignIn")
            .WithSummary("Signs in with an ID token from Google or Apple. Creates the account on first sign-in.");

        auth.MapPost("/refresh", RefreshAsync)
            .WithName("Refresh")
            .WithSummary("Exchanges a refresh token for a new access token and refresh token.");

        auth.MapPost("/sign-out", SignOutAsync)
            .WithName("SignOut")
            .WithSummary("Revokes the session that the refresh token belongs to.");

        return group;
    }

    private static async Task<Results<Ok<Session>, ValidationProblem, ProblemHttpResult>> SignInAsync(
        SignInRequest request, IdTokenValidator validator, SessionService sessions, CancellationToken cancellationToken)
    {
        if (!validator.IsKnownProvider(request.Provider))
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(SignInRequest.Provider)] = [$"Sign-in with '{request.Provider}' is not available."],
            });
        }

        var identity = await validator.ValidateAsync(request.Provider, request.IdToken, cancellationToken);
        if (identity is null)
        {
            return InvalidCredentials("The ID token is not valid.");
        }

        return TypedResults.Ok(await sessions.SignInAsync(identity, cancellationToken));
    }

    private static async Task<Results<Ok<Session>, ProblemHttpResult>> RefreshAsync(
        RefreshRequest request, SessionService sessions, CancellationToken cancellationToken)
    {
        var session = await sessions.RefreshAsync(request.RefreshToken, cancellationToken);
        return session is null
            ? InvalidCredentials("The refresh token is not valid. Sign in again.")
            : TypedResults.Ok(session);
    }

    private static async Task<NoContent> SignOutAsync(
        RefreshRequest request, SessionService sessions, CancellationToken cancellationToken)
    {
        await sessions.SignOutAsync(request.RefreshToken, cancellationToken);
        return TypedResults.NoContent();
    }

    private static ProblemHttpResult InvalidCredentials(string detail) =>
        TypedResults.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sign-in failed", detail: detail);
}
