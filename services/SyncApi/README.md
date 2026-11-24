# Tjuvstart sync API

ASP.NET Core (.NET 10) minimal API that will let signed-in learners sync their progress between devices. Guest mode in the web app does not depend on it. The design is in [ADR 0011](../../docs/adr/0011-sync-api-design.md).

What exists so far:

| Endpoint               | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `GET /health`          | Liveness check for the host                     |
| `GET /v1/info`         | Service name and version                        |
| `GET /openapi/v1.json` | OpenAPI document (Development environment only) |

## Run locally

```bash
dotnet run --project services/SyncApi/src/Tjuvstart.SyncApi
curl http://localhost:5020/v1/info
```

## Test

```bash
dotnet test services/SyncApi/SyncApi.slnx
dotnet format services/SyncApi/SyncApi.slnx --verify-no-changes
```

The tests start the whole API in memory with `WebApplicationFactory`, so they cover routing, CORS and error responses as well as the handlers.

## Configuration

| Setting                    | Description                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `WebClient:AllowedOrigins` | Browser origins allowed by CORS, for example `https://ismailsardi.github.io`. Origins only, no path. Checked at startup. |

Settings can also come from environment variables, for example `WebClient__AllowedOrigins__0`.
