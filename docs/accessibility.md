# Accessibility

Tjuvstart targets WCAG 2.2 level AA. This page records how it is checked and what the last audit found.

## How it is checked

- **axe-core in CI.** [`apps/web/e2e/a11y.spec.ts`](../apps/web/e2e/a11y.spec.ts) runs axe with the WCAG 2.0, 2.1 and 2.2 A/AA rules on every screen: the three onboarding steps, Today (before and after the daily goal is met), lessons, the alphabet, word cards and a deck, Me, practice, listening, AI practice, languages, shadowing, the level check, the daily session and three exercises inside a lesson. Each screen is checked in light and dark mode, on a desktop and a phone viewport. Any violation fails the end-to-end job.
- **Keyboard tests.** The same file checks that a lesson can be done with the keyboard alone, that focus moves to each new question, that the feedback is read out with the Continue button, and that moving between pages focuses the new heading and updates the tab title.
- **Lighthouse,** run by hand on twelve screens of a production build.
- **Manual checks** for what tools can't measure: tab order, focus visibility, reflow at 320 px wide, reduced motion and `lang` attributes.

## Audit, November 2026

Before the fixes, the automated tools found little:

| Check                                               | Before                             | After                      |
| --------------------------------------------------- | ---------------------------------- | -------------------------- |
| axe violations (WCAG A/AA, 16 screens × light/dark) | 1 rule, on 1 screen                | 0                          |
| Lighthouse accessibility                            | 100 on 11 screens, 95 on shadowing | 100 on all 12              |
| Lighthouse best practices                           | 100 on all 12                      | 100 on all 12              |
| Lighthouse performance                              | 92 to 100 (layout shift on Today)  | 92 to 100 (layout shift 0) |

The one axe finding was white text on the orange record button: 3.7:1, below the 4.5:1 minimum.

The manual pass found more:

- **Focus indicator too faint.** The focus ring was the brand blue at 55% opacity: 2.8:1 against the light background, below the 3:1 that WCAG 1.4.11 asks for. It is now solid brand blue (7.7:1 light, 8.4:1 dark). The Today tiles also showed a ring after a mouse click; they now show it for keyboard focus only.
- **Focus lost after every answer.** Continue takes focus after an answer, but once pressed it disappears with the question, so focus fell back to the top of the page. A keyboard user had to tab past the close button, the text tools and the tips to reach the next answer. Focus now moves to the new question in lessons, practice, the daily session, the level check and shadowing.
- **Feedback not tied to the button.** The Continue button now has the feedback ("Not quite. The answer is …") as its accessible description, so a screen reader reads both when focus lands on it.
- **Pages had no name.** Every screen was titled "Tjuvstart" and navigation left focus on the link that was pressed. The tab title now follows the page heading, and focus moves to that heading, as it would after a full page load.

Already in place and kept: `lang="nb"` on every Norwegian string and the learner's language on the rest of the page, so screen readers switch voice; reduced motion turns off Tusse's animations, card flips and the feedback slide-in; labelled form controls and landmarks; buttons as an alternative to swiping cards; no horizontal scrolling at 320 px.

## Known limits

- Automated tools catch only part of WCAG. The app has not yet been tested with a screen reader by someone who uses one daily.
- The orange for progress bars and the red for wrong answers are checked for 3:1 against the background, but colour is never the only signal: feedback always has text.
