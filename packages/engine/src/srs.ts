/**
 * SM-2-style spaced repetition (see docs/adr/0005-sm2-before-fsrs.md).
 * Pure functions: the caller stores the state and passes the current time.
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  /** Days until the next review. 0 for a card that is still being learned today. */
  interval: number;
  /** Multiplier applied to the interval after a successful review. */
  ease: number;
  /** Successful reviews in a row. */
  reps: number;
  /** Times the card was forgotten after being learned. */
  lapses: number;
  /** When the card is next due, in milliseconds since the epoch. */
  due: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_EASE = 1.3;
export const START_EASE = 2.5;
/** A forgotten card comes back in the same session, after about ten minutes. */
export const RELEARN_MS = 10 * 60 * 1000;

export function newCardState(now: number): CardState {
  return { interval: 0, ease: START_EASE, reps: 0, lapses: 0, due: now };
}

const EASE_CHANGE: Record<Grade, number> = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 };

/** Returns the card's state after a review graded at time `now`. */
export function review(state: CardState, grade: Grade, now: number): CardState {
  const ease = Math.max(MIN_EASE, state.ease + EASE_CHANGE[grade]);

  if (grade === 'again') {
    return {
      interval: 0,
      ease,
      reps: 0,
      lapses: state.reps > 0 ? state.lapses + 1 : state.lapses,
      due: now + RELEARN_MS,
    };
  }

  let interval: number;
  if (state.reps === 0) {
    interval = grade === 'easy' ? 4 : 1;
  } else if (state.reps === 1) {
    interval = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6;
  } else {
    const factor = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
    interval = Math.max(state.interval + 1, Math.round(state.interval * factor));
  }

  return {
    interval,
    ease,
    reps: state.reps + 1,
    lapses: state.lapses,
    due: now + interval * DAY_MS,
  };
}

export function isDue(state: CardState, now: number): boolean {
  return state.due <= now;
}
