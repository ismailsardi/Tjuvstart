import { describe, expect, it } from 'vitest';
import { currentStreak, longestStreak } from './streak';

const today = 100;

describe('currentStreak', () => {
  it('is zero for a new learner', () => {
    expect(currentStreak([], today)).toEqual({ days: 0, doneToday: false, atRisk: false });
  });

  it('counts consecutive days, today included', () => {
    expect(currentStreak([98, 99, 100], today)).toEqual({
      days: 3,
      doneToday: true,
      atRisk: false,
    });
  });

  it('keeps the streak while today is not done yet', () => {
    expect(currentStreak([98, 99], today)).toEqual({ days: 2, doneToday: false, atRisk: false });
  });

  it('forgives a single missed day', () => {
    expect(currentStreak([96, 97, 99, 100], today).days).toBe(4);
  });

  it('warns when yesterday was missed', () => {
    expect(currentStreak([97, 98], today)).toEqual({ days: 2, doneToday: false, atRisk: true });
  });

  it('ends after two missed days in a row', () => {
    expect(currentStreak([95, 96, 99, 100], today).days).toBe(2);
    expect(currentStreak([96, 97], today).days).toBe(0);
  });
});

describe('longestStreak', () => {
  it('is zero with no active days', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('forgives one missed day, counts only active days, and ends at two missed days', () => {
    // 1 2 _ 4 5 | _ _ | 8 9 10 11 12 13
    expect(longestStreak([1, 2, 4, 5])).toBe(4);
    expect(longestStreak([5, 1, 4, 2, 8, 9, 10, 11, 12, 13])).toBe(6);
  });

  it('keeps the best run after a break', () => {
    expect(longestStreak([1, 2, 3, 4, 5, 20])).toBe(5);
  });

  it('ignores repeated days', () => {
    expect(longestStreak([3, 3, 4])).toBe(2);
  });
});
