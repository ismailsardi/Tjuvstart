import { describe, expect, it } from 'vitest';
import { LEVEL_BASE, ratingToLevel } from './levels';

describe('ratingToLevel', () => {
  it('maps each base rating to its own level', () => {
    for (const [level, base] of Object.entries(LEVEL_BASE)) {
      expect(ratingToLevel(base)).toBe(level);
    }
  });

  it('uses band edges 100 points below each base', () => {
    expect(ratingToLevel(899)).toBe('A1');
    expect(ratingToLevel(900)).toBe('A2');
    expect(ratingToLevel(1299)).toBe('B1');
    expect(ratingToLevel(1300)).toBe('B2');
  });

  it('clamps at both ends', () => {
    expect(ratingToLevel(200)).toBe('A1');
    expect(ratingToLevel(2000)).toBe('B2');
  });
});
