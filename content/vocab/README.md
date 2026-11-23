# Word cards

One deck per level and topic: `vocab/<level>/<topic>.json`, validated by `schema/vocab-deck.schema.json`. A card holds the Norwegian side only: dictionary form, part of speech, gender for nouns, every form to match in texts, and an example sentence. Meanings and memory hooks live in each native-language pack under `words`, keyed by card id, and every card needs an entry in every pack.

`ignore.json` lists words in lesson texts that need no card, such as names of people and places.

## Sources

All cards, example sentences and hooks are written for this project and published under the repository licence. No external word list has been imported yet. Before one is, its licence must allow redistribution and derivative work, and the source and licence are recorded here ([ADR 0006](../../docs/adr/0006-vocabulary-sourcing.md)).
