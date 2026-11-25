import { describe, expect, it } from 'vitest';
import { LEVEL_BASE, levelProgress, ratingToLevel } from './levels';

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

describe('levelProgress', () => {
  it('puts a base rating halfway through its band', () => {
    expect(levelProgress(1000)).toEqual({ level: 'A2', next: 'B1', fraction: 0.5 });
  });

  it('starts at 0 on the band edge and nears 1 just below the next', () => {
    expect(levelProgress(900).fraction).toBe(0);
    expect(levelProgress(1099).fraction).toBeCloseTo(0.995);
  });

  it('gives A1 a wider band, clamps below it, and has no next level at B2', () => {
    expect(levelProgress(750).fraction).toBe(0.5);
    expect(levelProgress(500)).toEqual({ level: 'A1', next: 'A2', fraction: 0 });
    expect(levelProgress(1600)).toEqual({ level: 'B2', fraction: 1 });
  });
});
