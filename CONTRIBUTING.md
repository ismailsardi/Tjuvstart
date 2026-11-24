# Contributing

## Branches and pull requests

Work happens on short-lived branches named `<type>/<short-description>`, for example `fix/listening-play-button`. Every change reaches `main` through a pull request, and CI must pass before it is merged.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary in the imperative, lower case, no full stop>
```

- **Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `ci`, `build`, `chore`, `content`
- **Scopes:** `web`, `engine`, `audio`, `cli`, `api`, `e2e`, or leave it out for repository-wide changes

The body explains why the change is needed when the summary alone doesn't. For example:

```
fix(web): always show Play on listening exercises
content: add listening and dictation exercises to every lesson
```

## Checks to run before pushing

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
pnpm e2e
dotnet test tools/ContentCli/ContentCli.slnx
dotnet test services/SyncApi/SyncApi.slnx
```

Run `pnpm e2e` without a local `apps/web/public/audio` folder, since CI has no recorded audio either.
