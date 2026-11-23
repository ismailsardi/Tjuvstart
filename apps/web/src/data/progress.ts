import { DEFAULT_RATING, updateRating } from '@tjuvstart/engine';
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
