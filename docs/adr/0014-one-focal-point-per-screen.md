# 0014. One focal point per screen

- Status: Accepted
- Date: 2026-11-25

## Context

Much of the interface was built quickly, and it had drifted toward the generic look of template and AI-generated UIs. Measured against a common list of those tells, Tjuvstart already avoided some (no violet gradients, its own blue and orange palette, a tinted rather than near-black dark mode, and Tusse), but had others:

- Almost everything sat in a white card with the same shadow: the Today sections, every section on Me, the daily goal form, one-line messages, the lesson tips.
- Today's quick practice was a 2×2 grid of identical tiles, each an icon, a title, a line and a "Start" link, whatever the four things actually were.
- One radius (1rem) on cards, buttons, options and inputs.
- Level tags and highlights as tinted pills (10% background, same hue for the text).
- Uppercase, letter-spaced eyebrow labels above titles.
- The lesson end screen offered two buttons of equal weight side by side.
- A soft radial gradient on the front of the word card.

The bigger problem was attention, not decoration. Type sizes were consistent, but no screen decided what mattered most. On Today, once the daily goal was met, the loudest element was "One more round", and the next lesson sat below as one more card. In a lesson, two tinted tip boxes and two bordered panels pushed the question down the screen.

## Decision

Each main screen has one thing the learner can't miss, and everything else gets quieter so that it can stand out.

- **Today:** before the daily goal is met, the daily session is the filled block. Once it is met, the next lesson takes that place and moves to the top, with a "Start lesson" call to action, and the daily status drops to a plain section with text links.
- **Words:** reviews due today get the filled block. With nothing due it is one line of text.
- **Lessons:** the current track keeps a bordered surface; the others are flat sections.
- **Lesson:** the reading text stays on a surface (it is the document being read); the glossary, look-alikes and tips are plain disclosure rows, so the question sits higher.
- **Result:** one full-width primary button; shadowing is a link under it.

Supporting rules:

- Sections are separated by space and hairline rules, not by cards. A card is used only where the thing is an object (the word card, the reading text, a deck list) or is the focal point.
- Radius follows size: 1.25rem for the focal block and the word card, 0.75rem for containers, 0.625rem for controls, 0.3rem for small labels.
- Level tags are small outlined labels, not tinted pills. Pills stay only for chips that toggle.
- Labels are sentence case.
- No decorative gradients.

## Consequences

- A new screen needs an answer to "what is the one thing here?" before it gets styled.
- Fewer surfaces means fewer shadows to keep consistent between light and dark mode.
- The focal block reuses the existing hero colours, so contrast was already verified; axe now also checks Today in the goal-met state.
- Before and after screenshots are in [`docs/design/`](../design/).
