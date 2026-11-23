# 0002. Local-first PWA with zero running cost

- Status: Accepted
- Date: 2026-11-23

## Context

The project must not incur hosting or API costs. Learners also benefit from studying offline, for example while commuting.

## Decision

- The app is a static PWA hosted on GitHub Pages.
- Content, the level engine and learner progress live in the browser (IndexedDB).
- Content and audio are produced at build time, not at runtime.
- Account sync is optional and uses free tiers.
- AI features are optional and use the learner's own API key or on-device models.

## Consequences

- No server-side code in the core app, and no running cost.
- Writing and speaking feedback is self-assessed for learners who do not add a key.
- Free tiers can change; the app stays usable without sync, and progress can be exported.
