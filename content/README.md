# Content

Lessons, word cards, native-language packs and the CEFR descriptor map, stored as JSON so they can be reviewed in pull requests and bundled into the app at build time.

```
descriptors.json        CEFR can-do statements with stable IDs, e.g. A2-R-01
lessons/<level>/*.json  one file per lesson
l1/<language>/pack.json native-language pack, folder named by ISO 639-1 code
vocab/<level>/*.json    word card decks (see vocab/README.md)
alphabet.json           the 29 letters for the alphabet page, each with its name and an example word
schema/                 JSON Schemas for each file type
```

## Lessons

Every lesson has a `review` status, `pending` or `approved`. New lessons, and lessons with changed Norwegian text, are `pending` until a native speaker has checked them; only approved lessons are meant to ship in the store apps. `coverage` lists the lessons still waiting.

[docs/content-coverage.md](../docs/content-coverage.md) maps the situations and grammar a learner needs at each level to the lessons that cover them, and lists the gaps to write next.

`tracks.json` groups lessons into guided paths. Each track has a `level`: the home screen only suggests A1 tracks to learners whose estimated level is still A1.

## Items

Every item references the descriptors it practises. The validator rejects an item whose skill or level does not match its descriptors.

| Type              | Answer fields                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `multiple-choice` | `options`, `answer` (index into `options`)                                                                                                                                                              |
| `gap-fill`        | `answers` (every answer a native speaker would accept, not only the one being taught; one `___` blank per prompt; case, punctuation, small typos and a whole typed sentence are forgiven, see the spec) |
| `word-order`      | `tokens`, `answer` (must use exactly the tokens)                                                                                                                                                        |

`difficulty` is on the level engine's rating scale: about 1000 for a typical A2 item, 1200 for B1 (see `packages/engine/src/levels.ts`).

## Native-language packs

A pack helps speakers of one language: it never changes the Norwegian content, only what is shown around it.

| Field             | Use in the app                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `cognates`        | Words that look and mean the same. Highlighted in lesson texts and listed as "words you probably know". |
| `falseFriends`    | Words that look familiar but mean something else (`looksLike` names the trap). Highlighted in amber.    |
| `contrasts`       | Grammar notes on where Norwegian differs, shown as tips on the lessons listed in `lessons`.             |
| `itemNotes`       | A short explanation shown after answering the item, keyed by item ID.                                   |
| `words`           | Meaning and optional memory hook for each word card, keyed by card id.                                  |
| `lessonSummaries` | The lesson summary in the learner's language.                                                           |

A new pack has `"review": "pending"` until a speaker of that language has checked the translations; a pack without the field counts as approved. `coverage` lists the packs still waiting.

`forms` lists every inflected form to match in texts, in lower case. When a learner knows several languages, their native pack wins, then the others in the order they picked them. Text in a pack is written in that language, so the French pack is written in French.

## Checks

```bash
dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- validate content
dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- coverage content
```

`validate` checks JSON Schema conformance, unique IDs, descriptor references and answer keys, that packs only reference lessons and items that exist, and that every word card has a meaning in every pack. `coverage` lists how many lessons and items cover each descriptor, which lesson words have no word card yet, and which lessons still need a native-speaker review; CI publishes it in the job summary. `--enforce A2` makes gaps at a level fail the build, which will be switched on once A2 content is complete.
