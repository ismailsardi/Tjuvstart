import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_RATING } from '@tjuvstart/engine';
import type { GapFillItem } from '../content/types';
import { TjuvstartDb } from './db';
import { getProfile, recordAnswer } from './progress';

const item: GapFillItem = {
  id: 'g',
  type: 'gap-fill',
  skill: 'writing',
  level: 'A2',
  descriptors: ['A2-W-02'],
  difficulty: 1000,
  prompt: 'Jeg ___ i Oslo.',
  answers: ['bor'],
};

let db: TjuvstartDb;
afterEach(async () => {
  await db.delete();
});

describe('recordAnswer', () => {
  it('starts from a default guest profile', async () => {
    db = new TjuvstartDb('test-default');
    const profile = await getProfile(db);
    expect(profile.ratings.writing).toBe(DEFAULT_RATING);
    expect(profile.answers.writing).toBe(0);
  });

  it('raises the skill rating after a correct answer and logs the attempt', async () => {
    db = new TjuvstartDb('test-correct');
    const rating = await recordAnswer(item, 'lesson', true, db);

    const profile = await getProfile(db);
    expect(rating).toBeGreaterThan(DEFAULT_RATING);
    expect(profile.ratings.writing).toBe(rating);
    expect(profile.ratings.reading).toBe(DEFAULT_RATING);
    expect(profile.answers.writing).toBe(1);
    expect(await db.attempts.count()).toBe(1);
  });

  it('lowers the rating after a wrong answer', async () => {
    db = new TjuvstartDb('test-wrong');
    expect(await recordAnswer(item, 'lesson', false, db)).toBeLessThan(DEFAULT_RATING);
  });
});
