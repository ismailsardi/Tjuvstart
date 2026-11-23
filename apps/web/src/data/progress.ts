import { DEFAULT_RATING, newCardState, review, updateRating, type Grade } from '@tjuvstart/engine';
import { SKILLS, type Item, type Skill } from '../content/types';
import { db as defaultDb, GUEST_ID, type Profile, type TjuvstartDb } from './db';

function perSkill(value: number): Record<Skill, number> {
  return Object.fromEntries(SKILLS.map((skill) => [skill, value])) as Record<Skill, number>;
}

export function newGuestProfile(now = Date.now()): Profile {
  return { id: GUEST_ID, ratings: perSkill(DEFAULT_RATING), answers: perSkill(0), createdAt: now };
}

export async function getProfile(db: TjuvstartDb = defaultDb): Promise<Profile> {
  return (await db.profiles.get(GUEST_ID)) ?? newGuestProfile();
}

/** Stores one answer and updates the rating for the item's skill. Returns the new rating. */
export async function recordAnswer(
  item: Item,
  lessonId: string,
  correct: boolean,
  db: TjuvstartDb = defaultDb,
): Promise<number> {
  return db.transaction('rw', db.profiles, db.attempts, async () => {
    const profile = await getProfile(db);
    const ratingAfter = updateRating(profile.ratings[item.skill], item.difficulty, correct ? 1 : 0);
    const updated: Profile = {
      ...profile,
      ratings: { ...profile.ratings, [item.skill]: ratingAfter },
      answers: { ...profile.answers, [item.skill]: profile.answers[item.skill] + 1 },
    };
    await db.profiles.put(updated);
    await db.attempts.add({
      lessonId,
      itemId: item.id,
      skill: item.skill,
      correct,
      ratingAfter,
      at: Date.now(),
    });
    return ratingAfter;
  });
}

/** Saves the learner's native and known languages, creating the guest profile if needed. */
export async function saveLanguages(
  nativeLanguage: string,
  knownLanguages: readonly string[],
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    const profile = await getProfile(db);
    await db.profiles.put({
      ...profile,
      nativeLanguage,
      knownLanguages: knownLanguages.filter((code) => code !== nativeLanguage),
    });
  });
}

/** Adds cards to the learner's review deck. Cards already in it keep their schedule. */
export async function addCards(
  cardIds: readonly string[],
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<number> {
  return db.transaction('rw', db.cards, async () => {
    const existing = await db.cards.bulkGet([...cardIds]);
    const fresh = cardIds.filter((_, i) => existing[i] === undefined);
    await db.cards.bulkAdd(fresh.map((cardId) => ({ cardId, addedAt: now, ...newCardState(now) })));
    return fresh.length;
  });
}

/** Records a review and reschedules the card. */
export async function reviewCard(
  cardId: string,
  grade: Grade,
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    const progress = await db.cards.get(cardId);
    if (!progress) return;
    await db.cards.put({ ...progress, ...review(progress, grade, now) });
    await db.reviews.add({ cardId, grade, at: now });
  });
}

/**
 * Cards due for review at `now`, most overdue first. It reads the whole table rather than an
 * index range, so live queries also update when a card is added or rescheduled after `now`.
 */
export async function dueCards(now = Date.now(), db: TjuvstartDb = defaultDb) {
  const cards = await db.cards.orderBy('due').toArray();
  return cards.filter((card) => card.due <= now);
}

/**
 * Marks a lesson as completed, keeps the best score, and adds the words from its text
 * to the learner's cards. Returns how many new cards were added.
 */
export async function completeLesson(
  lessonId: string,
  score: number,
  total: number,
  cardIds: readonly string[],
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<number> {
  const previous = await db.completions.get(lessonId);
  await db.completions.put({
    lessonId,
    total,
    bestScore: Math.max(score, previous?.bestScore ?? 0),
    firstCompletedAt: previous?.firstCompletedAt ?? now,
    lastCompletedAt: now,
  });
  return addCards(cardIds, now, db);
}
