# 0013. A frequency-ranked core word list from open Norwegian data

- Status: Accepted
- Date: 2026-11-25

## Context

The goal is to cover the words a learner needs up to B2. No official list exists: CEFR describes what a learner can do at each level, not which words they know, and Norway has not published a word list per level. A common estimate for B2 is 4,000 to 5,000 word families.

[ADR 0006](0006-vocabulary-sourcing.md) required a source whose licence allows redistribution and derivative work before importing any list. The app is meant to be sold later, so the licence must also allow commercial use. The candidates checked:

| Source                                                       | Licence                                              | Verdict                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| NB N-gram, Bokmål (Språkbanken)                              | CC0                                                  | Used for frequencies                                                                          |
| Norsk Ordbank bokmål 2005 (Språkrådet, University of Bergen) | CC BY 4.0                                            | Used for lemmas, word classes, genders and forms                                              |
| NoWaC frequency lists (University of Oslo)                   | CC BY-NC-SA 2.0                                      | Not used: no commercial use                                                                   |
| Subtitle-based lists (OpenSubtitles, wordfreq)               | CC BY-SA, unclear rights in the underlying subtitles | Not used: share-alike would extend to the content, and the source text is not openly licensed |

## Decision

- Build `content/vocab/core-list.tsv` from the NB N-gram unigram counts, lemmatised with Norsk Ordbank. Keep the 5,000 most frequent lemmas and tag them A1 (ranks 1–700), A2 (701–1,500), B1 (1,501–3,000) and B2 (3,001–5,000). The method is in [tools/corelist](../../tools/corelist/README.md).
- The level tags are frequency bands. A card can sit at another level when the word is more basic than its frequency in news text suggests (family words, months).
- Cards are still chosen and written by hand, in batches, with our own example sentences and meanings. Inflected forms and gender come from Norsk Ordbank.
- New decks are marked `"review": "pending"`, like lessons, until a native speaker has read them.
- Credit for both sources is kept in `content/vocab/README.md`.

## Consequences

- "All words for B2" becomes measurable: the content CLI reports cards per band against the list.
- The corpus is newspaper text, so it over-ranks politics, sport and crime vocabulary and under-ranks some everyday words. Choosing cards by hand corrects for that, and a spoken or mixed corpus with an open licence could replace the counts later without changing the format.
- The CC BY credit must also appear in the store apps (an about or credits screen) before release.
- Translations in four languages for thousands of cards is a lot of review work, so the list is filled gradually, starting with the most frequent words.
