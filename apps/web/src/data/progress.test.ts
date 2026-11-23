import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_RATING } from '@tjuvstart/engine';
import type { GapFillItem } from '../content/types';
import { TjuvstartDb } from './db';
import { DAY_MS } from '@tjuvstart/engine';
import {
  addCards,
  completeLesson,
  dueCards,
  getProfile,
  recordAnswer,
  reviewCard,
  saveLanguages,
} from './progress';

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

describe('saveLanguages', () => {
  it('stores the native language and drops it from the known languages', async () => {
    db = new TjuvstartDb('test-languages');
    await saveLanguages('fr', ['en', 'fr'], db);
    const profile = await getProfile(db);
    expect(profile.nativeLanguage).toBe('fr');
    expect(profile.knownLanguages).toEqual(['en']);
    expect(profile.answers.reading).toBe(0);
  });
});

describe('word cards', () => {
  const now = Date.UTC(2026, 0, 1);

  it('adds new cards as due now and leaves existing ones alone', async () => {
    db = new TjuvstartDb('test-cards');
    expect(await addCards(['jobb', 'ha'], now, db)).toBe(2);
    await reviewCard('jobb', 'good', now, db);
    expect(await addCards(['jobb', 'syk'], now, db)).toBe(1);

    const due = await dueCards(now, db);
    expect(due.map((c) => c.cardId).sort()).toEqual(['ha', 'syk']);
    expect((await dueCards(now + DAY_MS, db)).map((c) => c.cardId)).toContain('jobb');
    expect(await db.reviews.count()).toBe(1);
  });
});

describe('completeLesson', () => {
  it('keeps the best score and adds the lesson words', async () => {
    db = new TjuvstartDb('test-completion');
    expect(await completeLesson('lesson', 8, 12, ['jobb'], 1000, db)).toBe(1);
    await completeLesson('lesson', 5, 12, ['jobb'], 2000, db);

    const done = await db.completions.get('lesson');
    expect(done).toMatchObject({
      bestScore: 8,
      total: 12,
      firstCompletedAt: 1000,
      lastCompletedAt: 2000,
    });
    expect(await db.cards.count()).toBe(1);
  });
});
