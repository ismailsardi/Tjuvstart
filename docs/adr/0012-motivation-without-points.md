# 0012. Motivation from learning, not points

- Status: Accepted
- Date: 2026-11-25

## Context

Learners need a reason to come back every day, and most language apps answer that with points, badges, leagues and hard streaks. The research on gamification is less kind to those than their popularity suggests:

- Points, badges and leaderboards reward activity, and people learn to chase the activity. Several products have removed badge systems after they drove volume instead of the behaviour that mattered.
- Engagement rises with the number of game mechanics only up to a point, then falls: the game layer starts to compete with the task.
- Long streaks drift from "I want to" to "I can't miss today", especially when they can't be paused.
- What lasts is competence feedback: evidence that you got better at the real thing.

Tjuvstart's learners are adults with jobs who want to function in Norwegian quickly. Their time is the scarce resource.

## Decision

Motivation features must show learning, not app use.

- No points, XP, leagues or badges for opening the app.
- The streak stays forgiving (one missed day is free, see the engine) and its wording stays calm.
- Results are delivered with some ceremony rather than as one line of text: a short build-up, a reveal, a moment of celebration. The score ring fills, each practised skill's meter moves from where it was to where it is, newly reached can-do statements appear, and Tusse cheers.
- Everything shown is real progress: the rating per skill, can-do statements, words learned.
- Every animation is decoration. The full result is in the page from the first frame, so screen readers get it at once, and `prefers-reduced-motion` turns the animation off.

## Consequences

- New motivation ideas have a test: does it make real progress visible, or does it reward taps?
- The level meter depends on the rating being honest, which it already has to be for item selection.
- Some engagement levers other apps use (leagues, loss-framed streak warnings) are off the table by choice.
