# 0006. Curated word cards now, licensed frequency list next

- Status: Accepted
- Date: 2026-11-23

## Context

The goal is a card for every word a learner needs at each CEFR level. That needs a level word list, and most published Norwegian frequency and learner lists come with licences that may not allow redistribution in a public repository.

## Decision

- Cards are authored in this repository (`content/vocab/`) under the project licence. Example sentences and memory hooks are our own.
- In the first version, the cards cover the vocabulary of the existing lessons. The content CLI reports lesson words that have no card, so gaps are visible in CI.
- Before level lists are imported, each candidate source is checked for a licence that allows redistribution and derivative work. The chosen source and its licence are recorded in `content/vocab/README.md`. Sources that forbid redistribution may still be used to check coverage, but not copied.

## Consequences

- No licensing risk in the published content.
- Coverage is measured against lesson texts until a level list is chosen, so "all words for the level" is not yet measured against an external list.
