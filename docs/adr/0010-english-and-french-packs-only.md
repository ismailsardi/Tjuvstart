# 0010. English and French native-language packs only

- Status: Accepted
- Date: 2026-11-23

## Context

The spec planned three native-language packs: English, French and Arabic. A pack is more than a translation. It needs the interface strings, cognates, false friends, grammar contrasts, notes on items and a meaning and memory hook for every word card, and each of those has to be checked by someone who knows both languages. An Arabic pack would also need a right-to-left layout across the app.

The time is better spent on content the learners already in scope will use: B1 and B2 lessons, and more word cards.

## Decision

Tjuvstart supports English and French speakers. Learners with another native language choose "Other" and get the English interface, as they do today. The onboarding no longer lists Arabic as coming soon.

Packs keep their `direction` field and the app keeps rendering `dir` from it, so a right-to-left pack can still be added later without changing the format.

## Consequences

- Content effort goes to levels, not languages.
- Arabic speakers learn through English, which many of the target users read well, but they lose native-language tips and cognate hints.
