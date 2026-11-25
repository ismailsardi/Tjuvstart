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

  it('gives the helmet at A2 and the lusekofte at B1, counting the level check', () => {
    expect([...earnedItems(profile(1000, 5))]).toEqual(['helmet']);
    expect([...earnedItems(profile(1200, 5))]).toEqual(['helmet', 'sweater']);
    expect([...earnedItems(profile(1000, 0, { placedAt: 1 }))]).toEqual(['helmet']);
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
    const p = profile(1000, 5);
    expect(outfitFor(p, earnedItems(p, 7))).toEqual({ head: 'helmet', neck: 'scarf' });
  });

  it('follows the learner’s choices, including an empty slot', () => {
    const p = profile(1000, 5, { outfit: { head: 'lue', neck: 'none' } });
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
