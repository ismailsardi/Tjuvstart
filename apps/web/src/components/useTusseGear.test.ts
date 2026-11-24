import { describe, expect, it } from 'vitest';
import type { Profile } from '../data/db';
import { gearFor } from './useTusseGear';

function profile(rating: number, answers: number, placedAt?: number): Profile {
  return {
    id: 'me',
    ratings: { reading: rating, listening: 800, writing: 800, speaking: 800 },
    answers: { reading: answers, listening: 0, writing: 0, speaking: 0 },
    placedAt,
    createdAt: 0,
  } as Profile;
}

describe('gearFor', () => {
  it('gives no gear before any skill has an estimate', () => {
    expect(gearFor(undefined)).toEqual({});
    expect(gearFor(profile(1200, 2))).toEqual({ helmet: false, sweater: false });
  });

  it('adds the helmet at A2 and the lusekofte at B1', () => {
    expect(gearFor(profile(800, 5))).toEqual({ helmet: false, sweater: false });
    expect(gearFor(profile(1000, 5))).toEqual({ helmet: true, sweater: false });
    expect(gearFor(profile(1200, 5))).toEqual({ helmet: true, sweater: true });
  });

  it('counts the level check as an estimate', () => {
    expect(gearFor(profile(1000, 0, Date.now()))).toEqual({ helmet: true, sweater: false });
  });
});
