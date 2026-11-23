import { describe, expect, it } from 'vitest';
import { currentStreak } from './streak';

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
