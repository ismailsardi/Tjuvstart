import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RATING, LEVEL_BASE, MIN_ANSWERS_FOR_ESTIMATE } from '@tjuvstart/engine';
import { getItem } from '../content/lessons';
import type { GapFillItem } from '../content/types';
import { TjuvstartDb } from './db';
import { DAY_MS } from '@tjuvstart/engine';
import {
  addCards,
  canDoProgress,
  dailyProgress,
  saveDailyGoal,
  wordCounts,
  dayNumber,
  completeLesson,
  dueCards,
  getProfile,
  mistakeMemory,
  recordAnswer,
  reviewCard,
  saveJobField,
  saveLanguages,
  recordShadowing,
  savePlacement,
  saveStartingPoint,
  shadowedSentences,
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

describe('saveStartingPoint', () => {
  it('starts a beginner at the A1 base rating for skills with no answers yet', async () => {
    db = new TjuvstartDb('test-beginner');
    await recordAnswer(item, 'lesson', true, db);
    const writing = (await getProfile(db)).ratings.writing;
    await saveStartingPoint('beginner', db);
    const profile = await getProfile(db);
    expect(profile.startingPoint).toBe('beginner');
    expect(profile.ratings.reading).toBe(LEVEL_BASE.A1);
    expect(profile.ratings.writing).toBe(writing);
  });

  it('leaves ratings alone for a learner who knows some Norwegian', async () => {
    db = new TjuvstartDb('test-some');
    await saveStartingPoint('some', db);
    const profile = await getProfile(db);
    expect(profile.startingPoint).toBe('some');
    expect(profile.ratings.reading).toBe(DEFAULT_RATING);
  });
});

describe('saveJobField', () => {
  it('keeps the rest of the profile', async () => {
    db = new TjuvstartDb('test-job');
    await saveLanguages('fr', ['en'], db);
    await saveJobField('health', db);
    const profile = await getProfile(db);
    expect(profile.jobField).toBe('health');
    expect(profile.nativeLanguage).toBe('fr');
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

  it('saves nothing when the words cannot be added', async () => {
    db = new TjuvstartDb('test-completion-atomic');
    vi.spyOn(db.cards, 'bulkAdd').mockRejectedValueOnce(new Error('disk full'));

    await expect(completeLesson('lesson', 8, 12, ['jobb'], 1000, db)).rejects.toThrow('disk full');
    expect(await db.completions.get('lesson')).toBeUndefined();
  });
});

describe('savePlacement', () => {
  it('sets ratings, counts them as estimates and stamps the date', async () => {
    db = new TjuvstartDb('test-placement');
    await recordAnswer(item, 'lesson', true, db);
    await savePlacement({ reading: 1210, writing: 990 }, 1234, db);
    const profile = await getProfile(db);
    expect(profile.ratings.reading).toBe(1210);
    expect(profile.ratings.writing).toBe(990);
    expect(profile.answers.reading).toBe(MIN_ANSWERS_FOR_ESTIMATE);
    expect(profile.answers.listening).toBe(0);
    expect(profile.placedAt).toBe(1234);
  });
});

describe('mistakeMemory', () => {
  const v2 = getItem('a2-sick-11')!;
  const phrase = getItem('a2-sick-08')!;

  it('flags a focus point missed twice and lists missed items newest first', async () => {
    db = new TjuvstartDb('test-mistakes');
    await recordAnswer(v2, 'calling-in-sick', false, db);
    await recordAnswer(phrase, 'calling-in-sick', false, db);
    await recordAnswer(v2, 'calling-in-sick', false, db);
    const memory = await mistakeMemory(Date.now(), db);
    expect(memory.recurring[0]).toBe('v2-word-order');
    expect(memory.missed).toEqual(['a2-sick-11', 'a2-sick-08']);
  });

  it('lets correct answers clear a mistake', async () => {
    db = new TjuvstartDb('test-recovery');
    await recordAnswer(v2, 'calling-in-sick', false, db);
    await recordAnswer(v2, 'calling-in-sick', true, db);
    await recordAnswer(v2, 'calling-in-sick', true, db);
    const memory = await mistakeMemory(Date.now(), db);
    expect(memory.recurring).toEqual([]);
    expect(memory.missed).toEqual([]);
    expect(memory.recentlyCorrect.has('a2-sick-11')).toBe(true);
  });
});

describe('shadowing', () => {
  it('counts each sentence judged close once', async () => {
    db = new TjuvstartDb('test-shadowing');
    await recordShadowing('l', 'Hei!', 'again', 1, db);
    await recordShadowing('l', 'Hei!', 'close', 2, db);
    await recordShadowing('l', 'Hei!', 'close', 3, db);
    await recordShadowing('l', 'Takk.', 'again', 4, db);
    expect(await shadowedSentences(db)).toBe(1);
  });
});

describe('listening speed', () => {
  const listening: GapFillItem = { ...item, id: 'l', skill: 'listening' };

  it('speeds up after three right listening answers and ignores other skills', async () => {
    db = new TjuvstartDb('test-listening');
    await recordAnswer(item, 'lesson', true, db);
    expect((await getProfile(db)).listening).toBeUndefined();
    for (let i = 0; i < 3; i++) await recordAnswer(listening, 'lesson', true, db);
    expect((await getProfile(db)).listening).toEqual({ rate: 1, streak: 0 });
    await recordAnswer(listening, 'lesson', false, db);
    expect((await getProfile(db)).listening?.rate).toBe(0.85);
  });
});

describe('wordCounts', () => {
  it('counts cards studied and cards known', async () => {
    db = new TjuvstartDb('test-word-counts');
    await addCards(['a', 'b', 'c'], 0, db);
    await db.cards.update('a', { interval: 30 });
    expect(await wordCounts(db)).toEqual({ studying: 3, known: 1 });
  });
});

describe('dailyProgress', () => {
  it('counts today and keeps the streak through one missed day', async () => {
    db = new TjuvstartDb('test-daily');
    const now = new Date(2026, 10, 23, 12).getTime();
    const add = (daysAgo: number, n: number) =>
      db.attempts.bulkAdd(
        Array.from({ length: n }, (_, i) => ({
          lessonId: 'l',
          itemId: `i${i}`,
          skill: 'reading' as const,
          correct: true,
          ratingAfter: 1000,
          at: now - daysAgo * DAY_MS,
        })),
      );
    await add(3, 8);
    await add(1, 8); // two days ago was missed
    await add(0, 3);

    const progress = await dailyProgress(now, db);
    expect(progress.today).toBe(3);
    expect(progress.streak).toEqual({ days: 2, doneToday: false, atRisk: false });
    expect(dayNumber(now) - dayNumber(now - DAY_MS)).toBe(1);
    expect(progress.goal).toBe(8);
    expect(progress.week.map((d) => d.active)).toEqual([
      false,
      false,
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it('uses the chosen goal for today, and never more than the default for the streak', async () => {
    db = new TjuvstartDb('test-daily-goal');
    const now = new Date(2026, 10, 23, 12).getTime();
    await db.attempts.bulkAdd(
      Array.from({ length: 6 }, (_, i) => ({
        lessonId: 'l',
        itemId: `i${i}`,
        skill: 'reading' as const,
        correct: true,
        ratingAfter: 1000,
        at: now - DAY_MS,
      })),
    );

    await saveDailyGoal('light', db);
    let progress = await dailyProgress(now, db);
    expect(progress).toMatchObject({ goal: 5, streakMin: 5, goalSize: 'light' });
    expect(progress.streak.days).toBe(1);

    await saveDailyGoal('serious', db);
    progress = await dailyProgress(now, db);
    expect(progress).toMatchObject({ goal: 18, streakMin: 8 });
    expect(progress.streak.days).toBe(0);
  });
});

describe('canDoProgress', () => {
  it('uses the latest answer to each item for each descriptor', async () => {
    db = new TjuvstartDb('test-can-do');
    // Three reading items that all check A2-R-03.
    const items = ['a2-doc-01', 'a2-doc-02', 'a2-doc-04'].map((id) => getItem(id)!);
    for (const it of items) await recordAnswer(it, 'l', true, db);
    expect((await canDoProgress(db)).get('A2-R-03')).toBe('can-do');

    await recordAnswer(items[0]!, 'l', false, db);
    expect((await canDoProgress(db)).get('A2-R-03')).toBe('practising');
    expect((await canDoProgress(db)).get('A2-W-01')).toBeUndefined();
  });
});
