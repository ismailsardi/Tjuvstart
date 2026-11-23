# 0008. AI features call Anthropic from the browser with the learner's own key

- Status: Accepted
- Date: 2026-11-23

## Context

Role-play, writing feedback and generated texts need a large language model. The app has no server and must cost nothing to run ([ADR 0002](0002-local-first-zero-cost.md)), so it cannot pay for model calls or hide a shared key behind a proxy. Some learners already have an API key and are happy to pay a few cents for feedback; most will not, and the core app must not depend on AI.

## Decision

AI features are optional and use the learner's own Anthropic API key.

- The browser calls the Anthropic Messages API directly with the official TypeScript SDK (`dangerouslyAllowBrowser`). There is no backend in between. This is safe here because the key belongs to the person using the page; it would not be for a shared key.
- The key is stored in IndexedDB, in its own table, apart from the profile, so a future sync never sends it anywhere. It is sent only to `api.anthropic.com` and can be removed from Me at any time.
- Each feature asks for structured output validated by a Zod schema (a reply plus a correction, rubric scores plus corrections, a text plus questions), so the interface never parses free text.
- The learner picks the model. The default is Claude Opus 5.5; Sonnet 5.5 and Haiku 5.5 are cheaper. Opus and Sonnet requests opt into server-side fallback, so a policy decline is retried on a fallback model instead of failing.
- Prompts get only what each feature needs: the estimated level, the interface language for explanations, the line of work and the grammar points the learner keeps missing. No name, email or history leaves the device.
- The SDK and the schema code load on first use and are not precached, so learners who never add a key never download them.

## Consequences

- Zero running cost and no server to secure; AI works the same on GitHub Pages as locally.
- A key in browser storage can be read by anything that runs in the page. The app ships no third-party scripts, and the settings text tells learners to use a key they can revoke.
- AI scores are shown as feedback only. They do not change the ratings, because model scores have not yet been checked against human raters (see the risks table in the spec).
- Speaking practice with speech-to-text stays in v2.
