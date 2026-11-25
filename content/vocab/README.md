# Word cards

One deck per level and topic: `vocab/<level>/<topic>.json`, validated by `schema/vocab-deck.schema.json`. A card holds the Norwegian side only: dictionary form, part of speech, gender for nouns, every form to match in texts, and an example sentence. Meanings and memory hooks live in each native-language pack under `words`, keyed by card id, and every card needs an entry in every pack.

`ignore.json` lists words in lesson texts that need no card, such as names of people and places.

A deck can carry `"review": "pending"` until a native speaker has read its Norwegian. Decks added from the core word list start that way, and `coverage` lists them.

## Core word list

`core-list.tsv` holds the 5,000 most frequent Bokmål lemmas with a level band (A1 to B2), built by [tools/corelist](../../tools/corelist/README.md). It decides which cards to write next. `coverage` shows how much of each band has a card.

## Sources

Example sentences, meanings and memory hooks are written for this project and published under the repository licence ([ADR 0006](../../docs/adr/0006-vocabulary-sourcing.md), [ADR 0013](../../docs/adr/0013-core-word-list.md)).

The core word list and the inflected forms on cards added from it are derived from:

- **NB N-gram, Bokmål**, Språkbanken, National Library of Norway. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Norsk Ordbank bokmål 2005**, Språkrådet and the University of Bergen, distributed by Språkbanken, National Library of Norway. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The list keeps only lemmas, word classes, genders and forms; nothing else from the database is included.
