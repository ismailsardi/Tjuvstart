# 0015. The troll gets a name and a wardrobe

- Status: Accepted
- Date: 2026-11-25

## Context

Tusse, the troll, has been in the app since the first mascot pass. It reacts to answers and gained two pieces of gear with level (a horned helmet at A2, a lusekofte at B1). Two things were missing: the learner had no reason to feel it was _their_ troll, and nothing rewarded showing up besides the streak number itself.

Rewards for streaks sit close to what [ADR 0012](0012-motivation-without-points.md) rules out. A streak that can take things away turns into "I can't miss today", which is the guilt loop we chose to avoid.

## Decision

- The learner names the troll as the last onboarding question, with Tusse filled in. The name can be changed later from Me, on the troll's own page (`#/troll`). A blank name falls back to Tusse.
- The troll has a wardrobe of eight items in six slots (head, eyes, neck, body, feet, back). The learner picks what it wears per slot, or nothing. A slot they never touched wears the latest item earned for it, so new clothes go on by themselves.
- Items come two ways, and both only add:
  - by level: the helmet at A2 and the lusekofte at B1, as before;
  - by streak milestones: a knitted scarf at 3 days, a lue at 7, round glasses at 14, wool slippers at 30, an anorak at 60 and a northern lights cape at 100.
- Streak items follow the **longest** streak ever (same forgiving rule as the current streak), not the current one. The longest streak and the highest level are also stored on the profile, so a broken streak, a lower rating or a later change of daily goal never takes anything back.
- New items are announced on the session result, next to the other progress, with a link to change the outfit. Nothing nags: no countdowns, no "you'll lose it" wording.
- The name, the outfit and the two bests live on the profile row, so they sync and appear in the account export with no server change.

## Consequences

- The streak gets a reward without becoming a threat, which keeps ADR 0012 intact.
- All art is inline SVG in `Tusse.tsx`, drawn for one 200 × 220 box. The idle animations pivot on points in that box, so items must not cover the ear and tail roots or the eyes.
- Adding an item means drawing it, adding it to `ITEMS` in `outfits.ts`, and adding its name and "got" line in the four interface languages.
