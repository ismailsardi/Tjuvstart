# Tjuvstart sync API

ASP.NET Core (.NET 10) minimal API that will let signed-in learners sync their progress between devices. Guest mode in the web app does not depend on it. The design is in [ADR 0011](../../docs/adr/0011-sync-api-design.md).

What exists so far:

| Endpoint                 | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `GET /health`            | Liveness check for the host (no database call)    |
| `GET /health/ready`      | Readiness check, including the database           |
| `GET /v1/info`           | Service name and version                          |
| `POST /v1/auth/sign-in`  | Exchange a Google or Apple ID token for a session |
| `POST /v1/auth/refresh`  | Rotate the refresh token, get a new access token  |
| `POST /v1/auth/sign-out` | Revoke the session                                |
| `GET /v1/account`        | The signed-in account and its linked logins       |
| `GET /openapi/v1.json`   | OpenAPI document (Development environment only)   |

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

## Sign-in

There are no passwords. The web app (and later the native apps) gets an ID token from Google or Apple and posts it to `/v1/auth/sign-in`. The API checks the signature against the provider's published keys, the issuer, the audience (one of our client ids) and the expiry. On the first sign-in it creates the account.

The response is a session:

- an **access token**: a JWT signed by the API, valid for 15 minutes, sent as `Authorization: Bearer ...`;
- a **refresh token**: an opaque random value valid for 60 days. Each refresh replaces it. The database only stores its SHA-256 hash. If an old refresh token is presented again, the whole session is revoked, since that means the token was copied. Clients should therefore refresh one request at a time (the web app will use a Web Lock across tabs).

Sign-in and refresh are rate limited per client address.

## Configuration

| Setting                     | Description                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ConnectionStrings:Sync`    | PostgreSQL connection string. Required.                                                                                             |
| `Database:MigrateOnStartup` | Apply pending migrations when the API starts. On in Development, off by default.                                                    |
| `Auth:SigningKey`           | Secret for signing access tokens, at least 32 characters. Required. Use a secret store or environment variable outside Development. |
| `Auth:Providers:<name>`     | Identity providers to accept. Each has `Authority` (issuer URL), `ClientIds` and optional `AdditionalIssuers`. See below.           |
| `WebClient:AllowedOrigins`  | Browser origins allowed by CORS, for example `https://ismailsardi.github.io`. Origins only, no path. Checked at startup.            |

Settings can also come from environment variables, for example `WebClient__AllowedOrigins__0`.

Provider settings for Google and Apple. Client ids are not secret, but they belong to whoever registers the app with the provider:

```json
"Auth": {
  "Providers": {
    "google": {
      "Authority": "https://accounts.google.com",
      "AdditionalIssuers": ["accounts.google.com"],
      "ClientIds": ["<web client id>.apps.googleusercontent.com"]
    },
    "apple": {
      "Authority": "https://appleid.apple.com",
      "ClientIds": ["<Services ID or bundle id>"]
    }
  }
}
```

No provider is configured by default, so sign-in returns a validation error until at least one is set.
