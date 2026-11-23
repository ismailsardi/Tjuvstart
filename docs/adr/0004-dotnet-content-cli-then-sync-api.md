# 0004. .NET content CLI first, sync API later

- Status: Accepted
- Date: 2026-11-23

## Context

The zero-cost constraint ([0002](0002-local-first-zero-cost.md)) rules out an always-on backend for the core app. The project still needs build-time tooling for content quality, and account sync later.

## Decision

1. Build a .NET 10 console app that validates content and checks CEFR descriptor coverage. It runs in CI and fails the build on errors.
2. After the MVP, add a small ASP.NET Core sync API on a free hosting tier. Until then, sync uses Supabase's free tier. The web app talks to sync through one interface, so the provider can be swapped.

## Consequences

- Content errors are caught before deployment at no running cost.
- Free hosting tiers have cold starts and usage limits; Supabase remains the fallback.
