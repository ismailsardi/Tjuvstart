import { describe, expect, it } from 'vitest';
import { DEFAULT_LISTENING_SPEED, LISTENING_RATES, updateListeningSpeed } from './listening';

const answer = (results: boolean[]) =>
  results.reduce(updateListeningSpeed, DEFAULT_LISTENING_SPEED);

describe('updateListeningSpeed', () => {
  it('speeds up one step after three right answers in a row', () => {
    expect(answer([true, true])).toEqual({ rate: 0.85, streak: 2 });
    expect(answer([true, true, true])).toEqual({ rate: 1, streak: 0 });
    expect(answer(Array(6).fill(true))).toEqual({ rate: 1.15, streak: 0 });
  });

  it('slows down one step after a mistake and restarts the streak', () => {
    expect(answer([true, true, false])).toEqual({ rate: 0.75, streak: 0 });
    expect(answer([true, true, true, false])).toEqual({ rate: 0.85, streak: 0 });
  });

  it('stays within the slowest and fastest rates', () => {
    expect(answer([false, false, false]).rate).toBe(LISTENING_RATES[0]);
    expect(answer(Array(30).fill(true)).rate).toBe(LISTENING_RATES.at(-1));
  });

  it('snaps a rate that is not on the list to the nearest step', () => {
    expect(updateListeningSpeed({ rate: 0.9, streak: 0 }, false).rate).toBe(0.75);
  });
});
