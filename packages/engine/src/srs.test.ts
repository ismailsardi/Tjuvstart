import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  KNOWN_INTERVAL,
  MIN_EASE,
  RELEARN_MS,
  isDue,
  isKnown,
  newCardState,
  review,
} from './srs';

const now = Date.UTC(2026, 0, 1);

describe('review', () => {
  it('schedules a new card 1, 6 and then about 15 days out when graded good', () => {
    let state = newCardState(now);
    const intervals: number[] = [];
    for (let i = 0; i < 3; i++) {
      state = review(state, 'good', state.due);
      intervals.push(state.interval);
    }
    expect(intervals).toEqual([1, 6, 15]);
  });

  it('brings a forgotten card back within the session and counts the lapse', () => {
    const learned = review(review(newCardState(now), 'good', now), 'good', now + DAY_MS);
    const forgotten = review(learned, 'again', now + 7 * DAY_MS);
    expect(forgotten.due).toBe(now + 7 * DAY_MS + RELEARN_MS);
    expect(forgotten.reps).toBe(0);
    expect(forgotten.lapses).toBe(1);
    expect(forgotten.ease).toBeLessThan(learned.ease);
  });

  it('gives easy cards longer intervals than hard ones', () => {
    const start = review(review(newCardState(now), 'good', now), 'good', now);
    expect(review(start, 'easy', now).interval).toBeGreaterThan(
      review(start, 'hard', now).interval,
    );
  });

  it('never lets the ease drop below the minimum', () => {
    let state = newCardState(now);
    for (let i = 0; i < 20; i++) state = review(state, 'again', now);
    expect(state.ease).toBe(MIN_EASE);
  });
});

describe('isDue', () => {
  it('is true once the due time has passed', () => {
    const state = review(newCardState(now), 'good', now);
    expect(isDue(state, now)).toBe(false);
    expect(isDue(state, now + DAY_MS)).toBe(true);
  });
});

describe('isKnown', () => {
  it('counts a card as known from a three-week interval', () => {
    const card = newCardState(0);
    expect(isKnown(card)).toBe(false);
    expect(isKnown({ ...card, interval: KNOWN_INTERVAL - 1 })).toBe(false);
    expect(isKnown({ ...card, interval: KNOWN_INTERVAL })).toBe(true);
  });
});
