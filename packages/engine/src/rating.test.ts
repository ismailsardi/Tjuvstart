import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING, expectedScore, updateRating } from './rating';

describe('expectedScore', () => {
  it('is 50% when ability matches difficulty', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });

  it('is higher for easier items', () => {
    expect(expectedScore(1000, 800)).toBeGreaterThan(expectedScore(1000, 1200));
  });
});

describe('updateRating', () => {
  it('moves up after a correct answer and down after a wrong one', () => {
    expect(updateRating(DEFAULT_RATING, 1000, 1)).toBeGreaterThan(DEFAULT_RATING);
    expect(updateRating(DEFAULT_RATING, 1000, 0)).toBeLessThan(DEFAULT_RATING);
  });

  it('rewards a correct answer on a hard item more than on an easy one', () => {
    const hard = updateRating(1000, 1300, 1) - 1000;
    const easy = updateRating(1000, 700, 1) - 1000;
    expect(hard).toBeGreaterThan(easy);
  });

  it('respects the k factor', () => {
    expect(updateRating(1000, 1000, 1, { k: 10 })).toBeCloseTo(1005);
  });

  it('rejects scores outside 0..1', () => {
    expect(() => updateRating(1000, 1000, 1.5)).toThrow(RangeError);
  });
});
