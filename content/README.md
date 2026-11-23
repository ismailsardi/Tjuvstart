# Content

Lessons and the CEFR descriptor map, stored as JSON so they can be reviewed in pull requests and bundled into the app at build time.

```
descriptors.json        CEFR can-do statements with stable IDs, e.g. A2-R-01
lessons/<level>/*.json  one file per lesson
schema/                 JSON Schemas for both file types
```

## Items

Every item references the descriptors it practises. The validator rejects an item whose skill or level does not match its descriptors.

| Type              | Answer fields                                                      |
| ----------------- | ------------------------------------------------------------------ |
| `multiple-choice` | `options`, `answer` (index into `options`)                         |
| `gap-fill`        | `answers` (all accepted answers; case and punctuation are ignored) |
| `word-order`      | `tokens`, `answer` (must use exactly the tokens)                   |

`difficulty` is on the level engine's rating scale: about 1000 for a typical A2 item, 1200 for B1 (see `packages/engine/src/levels.ts`).

## Checks

```bash
dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- validate content
dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- coverage content
```

`validate` checks JSON Schema conformance, unique IDs, descriptor references and answer keys. `coverage` lists how many lessons and items cover each descriptor; CI publishes it in the job summary. `--enforce A2` makes gaps at a level fail the build, which will be switched on once A2 content is complete.
