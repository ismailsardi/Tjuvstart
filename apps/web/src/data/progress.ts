import {
  DAILY_GOAL,
  DAY_MS,
  DEFAULT_LISTENING_SPEED,
  isDue,
  isKnown,
  canDoStatus,
  currentStreak,
  longestStreak,
  LEVELS,
  DEFAULT_RATING,
  LEVEL_BASE,
  MIN_ANSWERS_FOR_ESTIMATE,
  mistakeScores,
  newCardState,
  recurringMistakes,
  review,
  updateListeningSpeed,
  updateRating,
  type CanDoStatus,
  type Grade,
  type Streak,
} from '@tjuvstart/engine';
import { cleanTrollName, masteredLevel, type ItemId, type Slot } from '../components/outfits';
import { guessChance } from '../content/answers';
import { DEFAULT_GOAL, GOAL_SIZES, type GoalSize } from './daily';
import { getItem } from '../content/lessons';
import type { JobField } from '../content/vocab';
import { SKILLS, type Item, type Skill } from '../content/types';
import {
  db as defaultDb,
  GUEST_ID,
  type Profile,
  type ShadowingAttempt,
  type StartingPoint,
  type TjuvstartDb,
} from './db';

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
    // A lucky guess on a multiple-choice item should not raise the rating as much as a typed answer.
    const ratingAfter = updateRating(
      profile.ratings[item.skill],
      item.difficulty,
      correct ? 1 : 0,
      {
        guess: guessChance(item),
      },
    );
    const updated: Profile = {
      ...profile,
      ratings: { ...profile.ratings, [item.skill]: ratingAfter },
      answers: { ...profile.answers, [item.skill]: profile.answers[item.skill] + 1 },
    };
    if (item.skill === 'listening') {
      updated.listening = updateListeningSpeed(
        profile.listening ?? DEFAULT_LISTENING_SPEED,
        correct,
      );
    }
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

/**
 * Saves where the learner starts. A beginner with no answers yet starts at the A1 base rating,
 * so the first easy lessons move them up from A1 instead of down from A2.
 */
export async function saveStartingPoint(
  startingPoint: StartingPoint,
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    const profile = await getProfile(db);
    const ratings = { ...profile.ratings };
    if (startingPoint === 'beginner') {
      for (const skill of SKILLS) {
        if (profile.answers[skill] === 0) ratings[skill] = LEVEL_BASE.A1;
      }
    }
    await db.profiles.put({ ...profile, startingPoint, ratings });
  });
}

/** Saves how much the learner wants to do each day. */
export async function saveDailyGoal(size: GoalSize, db: TjuvstartDb = defaultDb): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    await db.profiles.put({ ...(await getProfile(db)), dailyGoal: size });
  });
}

/** Saves the troll's name. A blank name goes back to the default. */
export async function saveTrollName(name: string, db: TjuvstartDb = defaultDb): Promise<void> {
  const cleaned = cleanTrollName(name);
  await db.transaction('rw', db.profiles, async () => {
    const profile = await getProfile(db);
    const updated: Profile = { ...profile, trollName: cleaned || undefined };
    if (!cleaned) delete updated.trollName;
    await db.profiles.put(updated);
  });
}

/** Saves what the troll wears in one slot: an item, or 'none' for nothing. */
export async function saveOutfitSlot(
  slot: Slot,
  choice: ItemId | 'none',
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    const profile = await getProfile(db);
    await db.profiles.put({ ...profile, outfit: { ...profile.outfit, [slot]: choice } });
  });
}

/**
 * Remembers the longest streak and the highest level held so far, so clothes earned with them
 * stay earned after a break or a dip in a rating. Writes only when one of them went up.
 */
export async function rememberBests(db: TjuvstartDb = defaultDb): Promise<void> {
  const { longest } = await dailyProgress(Date.now(), db);
  await db.transaction('rw', db.profiles, async () => {
    const profile = await getProfile(db);
    const level = masteredLevel(profile);
    const higherLevel =
      level !== undefined &&
      (profile.bestLevel === undefined ||
        LEVELS.indexOf(level) > LEVELS.indexOf(profile.bestLevel));
    const longerStreak = longest > (profile.bestStreak ?? 0);
    if (!higherLevel && !longerStreak) return;
    await db.profiles.put({
      ...profile,
      ...(higherLevel ? { bestLevel: level } : {}),
      ...(longerStreak ? { bestStreak: longest } : {}),
    });
  });
}

/** Saves the learner's line of work, which picks their "my job" deck. */
export async function saveJobField(field: JobField, db: TjuvstartDb = defaultDb): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    await db.profiles.put({ ...(await getProfile(db)), jobField: field });
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
  return cards.filter((card) => isDue(card, now));
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
  // One transaction, so a lesson is never marked done without its words, or the other way round.
  return db.transaction('rw', db.completions, db.cards, async () => {
    const previous = await db.completions.get(lessonId);
    await db.completions.put({
      lessonId,
      total,
      bestScore: Math.max(score, previous?.bestScore ?? 0),
      firstCompletedAt: previous?.firstCompletedAt ?? now,
      lastCompletedAt: now,
    });
    return addCards(cardIds, now, db);
  });
}

/** Saves placement results: ratings replace the old ones and count as enough for an estimate. */
export async function savePlacement(
  ratings: Partial<Record<Skill, number>>,
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    const profile = await getProfile(db);
    const updated: Profile = {
      ...profile,
      ratings: { ...profile.ratings },
      answers: { ...profile.answers },
      placedAt: now,
    };
    for (const [skill, rating] of Object.entries(ratings) as [Skill, number][]) {
      updated.ratings[skill] = rating;
      updated.answers[skill] = Math.max(profile.answers[skill], MIN_ANSWERS_FOR_ESTIMATE);
    }
    await db.profiles.put(updated);
  });
}

export interface MistakeMemory {
  /** Focus points the learner keeps getting wrong, worst first. */
  recurring: string[];
  /** Items whose latest answer was wrong, most recent first. */
  missed: string[];
  /** Items answered correctly in the last day, left out of practice. */
  recentlyCorrect: Set<string>;
}

/** Reads the answer history and works out recurring mistakes and items worth retrying. */
export async function mistakeMemory(
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<MistakeMemory> {
  const attempts = await db.attempts.orderBy('at').toArray();
  const scores = mistakeScores(
    attempts.map((a) => ({ focus: getItem(a.itemId)?.focus ?? [], correct: a.correct })),
  );
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) latest.set(attempt.itemId, attempt);
  const newestFirst = [...latest.values()].sort((a, b) => b.at - a.at);
  return {
    recurring: recurringMistakes(scores),
    missed: newestFirst.filter((a) => !a.correct).map((a) => a.itemId),
    recentlyCorrect: new Set(
      newestFirst.filter((a) => a.correct && now - a.at < DAY_MS).map((a) => a.itemId),
    ),
  };
}

/** Saves the learner's verdict on one shadowed sentence. Recordings themselves are never stored. */
export async function recordShadowing(
  lessonId: string,
  text: string,
  verdict: ShadowingAttempt['verdict'],
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.shadowing.add({ lessonId, text, verdict, at: now });
}

/** How many different sentences the learner has said aloud and judged close to the model. */
export async function shadowedSentences(db: TjuvstartDb = defaultDb): Promise<number> {
  const attempts = await db.shadowing.toArray();
  return new Set(attempts.filter((a) => a.verdict === 'close').map((a) => a.text)).size;
}

/** The day a moment falls on, in the learner's time zone, as a whole number of days. */
export function dayNumber(at: number): number {
  return Math.floor((at - new Date(at).getTimezoneOffset() * 60_000) / DAY_MS);
}

export interface DayActivity {
  day: number;
  /** Answers, card reviews and shadowed sentences that day. */
  count: number;
  /** The day counts toward the streak. */
  active: boolean;
}

export interface DailyProgress {
  /** Answers, card reviews and shadowed sentences done today. */
  today: number;
  /** The learner's chosen daily goal. */
  goal: number;
  goalSize: GoalSize;
  /** Activity a day needs to count toward the streak. */
  streakMin: number;
  streak: Streak;
  /** The longest streak in the learner's history, by the same rule. */
  longest: number;
  /** The last seven days, oldest first, today last. */
  week: DayActivity[];
}

/**
 * Today's activity toward the learner's goal, the last week, and the forgiving streak (see the
 * engine). A day counts for the streak at the chosen goal or the engine's default, whichever is
 * smaller: picking a bigger goal raises today's target but never erases streak days already
 * earned, and a light goal makes days count sooner.
 */
export async function dailyProgress(
  now = Date.now(),
  db: TjuvstartDb = defaultDb,
): Promise<DailyProgress> {
  const [profile, attempts, reviews, shadowing] = await Promise.all([
    getProfile(db),
    db.attempts.toArray(),
    db.reviews.toArray(),
    db.shadowing.toArray(),
  ]);
  const goalSize = profile.dailyGoal ?? DEFAULT_GOAL;
  const goal = GOAL_SIZES[goalSize];
  const streakMin = Math.min(goal, DAILY_GOAL);
  const perDay = new Map<number, number>();
  for (const { at } of [...attempts, ...reviews, ...shadowing]) {
    const day = dayNumber(at);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const today = dayNumber(now);
  const activeDays = [...perDay].filter(([, n]) => n >= streakMin).map(([day]) => day);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today - 6 + i;
    const count = perDay.get(day) ?? 0;
    return { day, count, active: count >= streakMin };
  });
  return {
    today: perDay.get(today) ?? 0,
    goal,
    goalSize,
    streakMin,
    streak: currentStreak(activeDays, today),
    longest: longestStreak(activeDays),
    week,
  };
}

export interface WordCounts {
  /** Cards in the learner's deck. */
  studying: number;
  /** Cards recalled over three weeks or more (see the engine's isKnown). */
  known: number;
}

/** How many words the learner is studying and how many they know. */
export async function wordCounts(db: TjuvstartDb = defaultDb): Promise<WordCounts> {
  const cards = await db.cards.toArray();
  return { studying: cards.length, known: cards.filter(isKnown).length };
}

/** Where the learner stands on each CEFR descriptor, from their latest answer to each item. */
export async function canDoProgress(
  db: TjuvstartDb = defaultDb,
): Promise<Map<string, CanDoStatus>> {
  const attempts = await db.attempts.orderBy('at').toArray();
  const latest = new Map<string, boolean>();
  for (const attempt of attempts) latest.set(attempt.itemId, attempt.correct);

  const byDescriptor = new Map<string, boolean[]>();
  for (const [itemId, correct] of latest) {
    for (const id of getItem(itemId)?.descriptors ?? []) {
      byDescriptor.set(id, [...(byDescriptor.get(id) ?? []), correct]);
    }
  }
  return new Map([...byDescriptor].map(([id, answers]) => [id, canDoStatus(answers)]));
}
