# 0011. Sync API: accounts, data model and hosting

- Status: Accepted (hosting still open)
- Date: 2026-11-24
- Builds on [ADR 0002](0002-local-first-zero-cost.md) and step 2 of [ADR 0004](0004-dotnet-content-cli-then-sync-api.md).

## Context

Progress lives only in the browser's IndexedDB. Learners who switch phones, clear site data or study on two devices lose it. ADR 0004 planned a small ASP.NET Core API for sync once the MVP was done, and the MVP is done.

Constraints:

- **Guest mode stays the default and works offline.** Signing in is optional. The app must never wait on the network to show a lesson or record an answer.
- **No running cost for now.** Free hosting tiers only, which means cold starts and usage limits.
- **Native apps later.** If Tjuvstart ships to the App Store and Google Play, Apple requires Sign in with Apple whenever another third-party login is offered, and both stores require account deletion from inside the app. GDPR also gives learners the right to a copy of their data. The design has to make these cheap to add, not a rewrite.
- **The AI key never leaves the device.** It is already stored in its own table so it cannot travel with progress.

## Decision

### Shape of the service

- A single ASP.NET Core (.NET 10, LTS) minimal API in `services/SyncApi`, versioned under `/v1`.
- Errors are RFC 9457 problem details everywhere, including 404 and 405.
- CORS allows only configured web origins (GitHub Pages in production, Vite on localhost in development). The list is validated at startup.
- Integration tests run the real pipeline in memory with `WebApplicationFactory`. CI builds with warnings as errors and checks formatting.

### Accounts and sign-in

- No passwords. Learners sign in with an identity provider, and the API verifies the provider's ID token against its published signing keys. Google comes first, then Sign in with Apple, then an email magic link for people who use neither.
- An account has an internal id. Provider identities (`provider`, `subject`) are stored in a separate table, so one account can link several providers, and Apple's private relay e-mail addresses need no special handling.
- After verification the API issues its own short-lived access token (a signed JWT) and a rotating refresh token. Refresh tokens are stored hashed, and reuse of an old one revokes the whole chain.
- Endpoints need the access token, except health, info and sign-in.

### Sync model

The client tables fall into two groups, and each syncs differently:

| Client table                       | Kind                  | Sync rule                                                                                               |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| `attempts`, `reviews`, `shadowing` | Append-only logs      | Each row gets a client-generated UUID. Uploads are idempotent: a row the server already has is ignored. |
| `profiles`, `cards`, `completions` | Current state per key | Last writer wins per record, using the client's `updatedAt`. Ties are broken by the server's order.     |
| `aiSettings`                       | Device only           | Never synced.                                                                                           |

- The server stamps every accepted change with a per-account, increasing sequence number. A client pulls with "everything after sequence N" and stores the new N. This avoids relying on device clocks to decide what is new.
- Push and pull are separate calls with a size limit per batch, so a learner with months of offline history can catch up in several requests on a slow connection.
- When a guest signs in for the first time, the first push uploads everything local. Nothing changes for learners who never sign in.
- The web app talks to sync through one interface (ADR 0004), so the provider behind it can change.

### Deletion and export

- `DELETE /v1/account` removes the account, its identities, tokens and all synced rows in one transaction. It is a hard delete, not a flag. For Apple accounts it also revokes the Apple token, which Apple requires.
- `GET /v1/account/export` returns everything stored for the account as one JSON document, in the same shape the client uses, so it doubles as a backup.

### Storage

- EF Core with PostgreSQL. Integration tests run against PostgreSQL in a container (Testcontainers), not an in-memory substitute, so queries behave the same as in production.
- Data is stored in an EU region.

### Hosting

Not decided yet. The options below all have a free tier today; limits change, so they need checking when the API is deployed. The API runs in a container so it can move between them.

| Option                                  | Fit                                                                       | Watch out for                                        |
| --------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Azure Container Apps (consumption plan) | Scales to zero, monthly free grant, EU regions, the natural home for .NET | Cold start of a few seconds after idle; needs a card |
| Azure App Service F1                    | Simplest deploy for ASP.NET Core                                          | Daily CPU quota, no always-on, no custom domains     |
| Render free web service                 | Deploys a Dockerfile straight from GitHub                                 | Sleeps after inactivity, slow first request          |
| Database: Neon or Supabase PostgreSQL   | Free PostgreSQL with EU regions                                           | Storage caps; Supabase pauses inactive free projects |

## Consequences

- Learners can move progress between devices and recover it after clearing the browser, while guest mode keeps working with no network at all.
- Logs merge without conflicts. State records can lose an edit made offline on two devices at once, which is acceptable for progress data (the newer review schedule wins).
- The sign-in design already covers what the stores require (Sign in with Apple, in-app deletion, data export), so a native release does not change the API's shape.
- Free tiers mean cold starts. The client syncs in the background and never blocks the UI on it.
- The spec still lists Supabase as the first sync provider. It stays as the fallback if free .NET hosting disappears.
