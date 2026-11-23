# 0005. SM-2-style scheduling before FSRS

- Status: Accepted
- Date: 2026-11-23

## Context

Word cards need a spaced repetition scheduler that runs on the device and works from the first review. FSRS schedules more accurately, but its default parameters are fitted to large review histories and it is more work to implement and test well.

## Decision

Start with an SM-2-style scheduler in `packages/engine`: each card keeps an interval, an ease factor and a due date, and the learner grades a review as _again_, _hard_, _good_ or _easy_. The scheduler is a pure function, so it is easy to test and to replace.

## Consequences

- Small, predictable and fully offline.
- Intervals are less precise than FSRS. Review logs are stored from the start, so FSRS can be adopted behind the same interface and fitted to real data later.
