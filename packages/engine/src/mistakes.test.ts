import { describe, expect, it } from 'vitest';
import { mistakeScores, recurringMistakes } from './mistakes';

const v2 = (correct: boolean) => ({ focus: ['v2-word-order'], correct });

describe('error memory', () => {
  it('flags a focus point after repeated mistakes', () => {
    const scores = mistakeScores([v2(false), v2(true), v2(false)]);
    expect(scores.get('v2-word-order')).toBe(3);
    expect(recurringMistakes(scores)).toEqual(['v2-word-order']);
  });

  it('clears a point after it is answered right a few times', () => {
    const scores = mistakeScores([v2(false), v2(true), v2(true)]);
    expect(recurringMistakes(scores)).toEqual([]);
  });

  it('never goes below zero, so early correct answers do not bank credit', () => {
    const scores = mistakeScores([v2(true), v2(true), v2(true), v2(false)]);
    expect(scores.get('v2-word-order')).toBe(2);
  });

  it('orders recurring points worst first', () => {
    const scores = mistakeScores([
      { focus: ['noun-gender'], correct: false },
      v2(false),
      v2(false),
    ]);
    expect(recurringMistakes(scores)).toEqual(['v2-word-order', 'noun-gender']);
  });
});
