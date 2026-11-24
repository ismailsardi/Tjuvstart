# Tjuvstart sync API

ASP.NET Core (.NET 10) minimal API that will let signed-in learners sync their progress between devices. Guest mode in the web app does not depend on it. The design is in [ADR 0011](../../docs/adr/0011-sync-api-design.md).

What exists so far, besides the `accounts` and `external_identities` tables:

| Endpoint               | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `GET /health`          | Liveness check for the host (no database call)  |
| `GET /health/ready`    | Readiness check, including the database         |
| `GET /v1/info`         | Service name and version                        |
| `GET /openapi/v1.json` | OpenAPI document (Development environment only) |

## Run locally

The API needs PostgreSQL. The compose file starts one that matches the development settings, and the API applies migrations when it starts.

```bash
docker compose -f services/SyncApi/compose.yaml up -d
dotnet run --project services/SyncApi/src/Tjuvstart.SyncApi
curl http://localhost:5020/v1/info
```

## Test

```bash
dotnet test services/SyncApi/SyncApi.slnx
dotnet format services/SyncApi/SyncApi.slnx --verify-no-changes
```

The tests start the whole API in memory with `WebApplicationFactory`, so they cover routing, CORS and error responses as well as the handlers. They need Docker: Testcontainers starts one PostgreSQL container for the run and gives every test its own database.

## Database

EF Core with PostgreSQL. Tables use snake_case names. To change the schema, edit the model in `src/Tjuvstart.SyncApi/Data` and add a migration:

```bash
cd services/SyncApi
dotnet tool restore
dotnet ef migrations add <Name> -p src/Tjuvstart.SyncApi -o Data/Migrations
```

CI fails if the model and the migrations are out of step.

## Configuration

| Setting                     | Description                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ConnectionStrings:Sync`    | PostgreSQL connection string. Required.                                                                                  |
| `Database:MigrateOnStartup` | Apply pending migrations when the API starts. On in Development, off by default.                                         |
| `WebClient:AllowedOrigins`  | Browser origins allowed by CORS, for example `https://ismailsardi.github.io`. Origins only, no path. Checked at startup. |

Settings can also come from environment variables, for example `WebClient__AllowedOrigins__0`.
