import { describe, expect, it } from 'vitest';
import type { Profile } from '../data/db';
import { cleanTrollName, earnedItems, nextStreakItem, outfitFor, trollName } from './outfits';

function profile(rating: number, answers: number, extra: Partial<Profile> = {}): Profile {
  return {
    id: 'me',
    ratings: { reading: rating, listening: 800, writing: 800, speaking: 800 },
    answers: { reading: answers, listening: 0, writing: 0, speaking: 0 },
    createdAt: 0,
    ...extra,
  } as Profile;
}

describe('earnedItems', () => {
  it('earns nothing before a level estimate or a streak', () => {
    expect([...earnedItems(undefined)]).toEqual([]);
    expect([...earnedItems(profile(1200, 2))]).toEqual([]);
  });

  it('gives the helmet once A2 is held and the sweater once B1 is held', () => {
    expect([...earnedItems(profile(1000, 20))]).toEqual(['helmet']);
    expect([...earnedItems(profile(1250, 30))]).toEqual(['helmet', 'sweater']);
  });

  it('does not reward a first estimate or a level check on its own', () => {
    // Five answers give Today a level, but one lucky run can swing it a whole band.
    expect([...earnedItems(profile(1000, 5))]).toEqual([]);
    expect([...earnedItems(profile(1000, 5, { placedAt: 1 }))]).toEqual([]);
  });

  it('counts the lower half of a band as the level below', () => {
    // 950 is inside the A2 band but under its middle, so A2 is not held yet.
    expect([...earnedItems(profile(950, 40))]).toEqual([]);
    expect([...earnedItems(profile(1150, 40))]).toEqual(['helmet']);
  });

  it('gives streak items at 3, 7, 14, 30, 60 and 100 days', () => {
    const at = (days: number) => [...earnedItems(profile(800, 0), days)];
    expect(at(2)).toEqual([]);
    expect(at(3)).toEqual(['scarf']);
    expect(at(7)).toEqual(['scarf', 'lue']);
    expect(at(14)).toEqual(['scarf', 'lue', 'glasses']);
    expect(at(30)).toEqual(['scarf', 'lue', 'glasses', 'slippers']);
    expect(at(60)).toEqual(['scarf', 'lue', 'glasses', 'slippers', 'anorak']);
    expect(at(100)).toEqual(['scarf', 'lue', 'glasses', 'slippers', 'anorak', 'cape']);
  });

  it('keeps what was earned after a broken streak or a lower rating', () => {
    const earned = earnedItems(profile(800, 5, { bestStreak: 8, bestLevel: 'B1' }), 0);
    expect([...earned]).toEqual(['scarf', 'lue', 'helmet', 'sweater']);
  });
});

describe('outfitFor', () => {
  it('wears the latest item earned for each slot by default', () => {
    const p = profile(1000, 20);
    expect(outfitFor(p, earnedItems(p, 7))).toEqual({ head: 'helmet', neck: 'scarf' });
  });

  it('follows the learner’s choices, including an empty slot', () => {
    const p = profile(1000, 20, { outfit: { head: 'lue', neck: 'none' } });
    expect(outfitFor(p, earnedItems(p, 7))).toEqual({ head: 'lue' });
  });

  it('skips a chosen item that is not earned, and an item in the wrong slot', () => {
    const p = profile(800, 0, { outfit: { head: 'cape', neck: 'glasses' } });
    expect(outfitFor(p, earnedItems(p, 3))).toEqual({ neck: 'scarf' });
  });
});

describe('troll name', () => {
  it('defaults to Tusse and tidies what the learner typed', () => {
    expect(trollName(undefined)).toBe('Tusse');
    expect(trollName({ trollName: '   ' })).toBe('Tusse');
    expect(trollName({ trollName: '  Store   Knut ' })).toBe('Store Knut');
    expect(cleanTrollName('Abcdefghijklmnopqrstuvwxyz')).toBe('Abcdefghijklmnopqrst');
  });
});

describe('nextStreakItem', () => {
  it('names the next streak item still to earn', () => {
    expect(nextStreakItem(new Set())?.id).toBe('scarf');
    expect(nextStreakItem(new Set(['scarf', 'helmet']))?.id).toBe('lue');
    expect(
      nextStreakItem(new Set(['scarf', 'lue', 'glasses', 'slippers', 'anorak', 'cape'])),
    ).toBeUndefined();
  });
});
