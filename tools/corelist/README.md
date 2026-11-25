# Core word list

`content/vocab/core-list.tsv` ranks the 5,000 most frequent Bokmål words (lemmas, not word forms) and gives each one a level band. It is the to-do list for word cards: the content CLI's `coverage` command reports how much of each band has a card, and which words are next.

## Sources

| Data | Licence | Used for |
| --- | --- | --- |
| NB N-gram, Bokmål (Språkbanken, National Library of Norway), unigrams by frequency: [`1gram_nob_f1_freq.zip`](https://www.nb.no/sbfil/tekst/1gram_nob_f1_freq.zip), [documentation](https://www.nb.no/sbfil/dok/ngram_nob.pdf) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | How often each word form occurs (newspaper text, about 1.2 billion words) |
| [Norsk Ordbank bokmål 2005](https://www.nb.no/sprakbanken/ressurskatalog/oai-nb-no-sbr-5/) (Språkrådet and the University of Bergen, distributed by Språkbanken), version 2022-02-01 ([`20220201_norsk_ordbank_nob_2005.tar.gz`](https://www.nb.no/sbfil/leksikalske_databaser/ordbank/20220201_norsk_ordbank_nob_2005.tar.gz)): `fullformsliste.txt`, `lemma.txt` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Which lemma each form belongs to, part of speech, noun gender, and the inflected forms on new cards |

Both licences allow commercial use and redistribution. CC BY asks for credit, which is given in [content/vocab/README.md](../../content/vocab/README.md). Neither download is committed: fetch them again to rebuild.

## How the list is built

1. Count lower-case word forms only. Capitalised tokens are mostly names and sentence starts.
2. Credit each form to the lemmas Norsk Ordbank lists for it. A form that belongs to several lemmas is shared in proportion to how often each lemma's unambiguous forms occur, so "er" and "var" go to "være" and not to the rare noun "et var". When a function word and a content word have the same spelling ("i" the preposition and "i" the letter), the function word starts far ahead.
3. Drop homographs that only rank because of a more frequent twin: verbs whose infinitive is a form of an adjective ("hele", to heal), participle adjectives filed under a verb, and nouns that are a form of a verb ("ligger"). `exclude.txt` removes the few cases these rules miss and keeps the few real words they catch.
4. Keep the top 5,000 and tag them by rank: A1 1–700, A2 701–1,500, B1 1,501–3,000, B2 3,001–5,000. These are frequency bands, not a CEFR standard (none exists for vocabulary). Cards may sit at another level when the word is plainly more basic than its newspaper frequency suggests.

The corpus is news text, so politics, sport and crime words rank higher than in everyday speech. That is why cards are chosen from the list by hand, batch by batch, rather than generated for every row.

## Commands

```bash
# rebuild the list
python3 tools/corelist/build_core_list.py 1gram_nob_f1_freq.frk fullformsliste.txt lemma.txt

# add a batch of hand-written cards (see the docstring in add_cards.py for the format)
python3 tools/corelist/add_cards.py batch.txt 1gram_nob_f1_freq.frk fullformsliste.txt lemma.txt
pnpm prettier --write content
```

`add_cards.py` takes the example sentence and the meaning in each native language from the batch file and looks up the forms and gender in Norsk Ordbank, so inflections are never typed by hand. New decks are marked `"review": "pending"` until a native speaker has read them.

Tests: `python3 -m unittest discover -s tools/corelist`.
