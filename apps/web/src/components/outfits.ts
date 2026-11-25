import { LEVELS, MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel, type Level } from '@tjuvstart/engine';
import { SKILLS } from '../content/types';
import type { Profile } from '../data/db';

/**
 * The troll's wardrobe. Clothes are earned two ways: by level (what the learner can do) and by
 * streak milestones (showing up). Both only ever add: an item stays earned when a streak breaks
 * or a rating dips, so nothing here can be lost (ADR 0015).
 */
export const SLOTS = ['head', 'eyes', 'neck', 'body', 'feet', 'back'] as const;
export type Slot = (typeof SLOTS)[number];

export type ItemId =
  'helmet' | 'lue' | 'glasses' | 'scarf' | 'sweater' | 'anorak' | 'slippers' | 'cape';

/** One item per slot. A missing slot is empty. */
export type Outfit = Partial<Record<Slot, ItemId>>;

export type Unlock = { level: Level } | { streak: number };

export interface Item {
  id: ItemId;
  slot: Slot;
  unlock: Unlock;
}

/** In the order they're usually earned. */
export const ITEMS: readonly Item[] = [
  { id: 'scarf', slot: 'neck', unlock: { streak: 3 } },
  { id: 'lue', slot: 'head', unlock: { streak: 7 } },
  { id: 'helmet', slot: 'head', unlock: { level: 'A2' } },
  { id: 'glasses', slot: 'eyes', unlock: { streak: 14 } },
  { id: 'slippers', slot: 'feet', unlock: { streak: 30 } },
  { id: 'sweater', slot: 'body', unlock: { level: 'B1' } },
  { id: 'anorak', slot: 'body', unlock: { streak: 60 } },
  { id: 'cape', slot: 'back', unlock: { streak: 100 } },
];

export const DEFAULT_TROLL_NAME = 'Tusse';
export const MAX_TROLL_NAME = 20;

export function itemById(id: ItemId): Item {
  return ITEMS.find((item) => item.id === id)!;
}

/** The troll's name, cleaned up: trimmed, single spaces, at most 20 characters, never empty. */
export function trollName(profile: Pick<Profile, 'trollName'> | undefined): string {
  const name = cleanTrollName(profile?.trollName ?? '');
  return name || DEFAULT_TROLL_NAME;
}

export function cleanTrollName(raw: string): string {
  return [...raw.replace(/\s+/g, ' ').trim()].slice(0, MAX_TROLL_NAME).join('').trim();
}

/**
 * The learner's best estimated level in any skill, or undefined before any estimate. A skill
 * counts once it has enough answers, or after the level check.
 */
export function bestLevel(profile: Profile | undefined): Level | undefined {
  if (!profile) return undefined;
  let best = -1;
  for (const skill of SKILLS) {
    const rating = profile.ratings[skill];
    const estimated =
      rating !== undefined &&
      ((profile.answers[skill] ?? 0) >= MIN_ANSWERS_FOR_ESTIMATE || profile.placedAt !== undefined);
    if (estimated) best = Math.max(best, LEVELS.indexOf(ratingToLevel(rating)));
  }
  return best < 0 ? undefined : LEVELS[best];
}

/**
 * Which items are earned. Level items follow the best level ever recorded as well as the current
 * one, and streak items the longest streak ever, so a dip never takes anything back.
 */
export function earnedItems(profile: Profile | undefined, longestStreak = 0): Set<ItemId> {
  const level = bestLevel(profile);
  const levelIndex = Math.max(
    level ? LEVELS.indexOf(level) : -1,
    profile?.bestLevel ? LEVELS.indexOf(profile.bestLevel) : -1,
  );
  const streak = Math.max(longestStreak, profile?.bestStreak ?? 0);
  const earned = new Set<ItemId>();
  for (const item of ITEMS) {
    const ok =
      'level' in item.unlock
        ? levelIndex >= LEVELS.indexOf(item.unlock.level)
        : streak >= item.unlock.streak;
    if (ok) earned.add(item.id);
  }
  return earned;
}

/**
 * What the troll wears. Slots the learner has never set wear the latest earned item for that
 * slot, so new clothes go on by themselves; a slot set to 'none' stays empty; a chosen item that
 * isn't earned (say, from a synced profile ahead of local data) is skipped.
 */
export function outfitFor(profile: Profile | undefined, earned: Set<ItemId>): Outfit {
  const chosen = profile?.outfit ?? {};
  const outfit: Outfit = {};
  for (const slot of SLOTS) {
    const choice = chosen[slot];
    if (choice === 'none') continue;
    if (choice && earned.has(choice) && itemById(choice).slot === slot) {
      outfit[slot] = choice;
      continue;
    }
    const latest = ITEMS.filter((item) => item.slot === slot && earned.has(item.id)).at(-1);
    if (latest) outfit[slot] = latest.id;
  }
  return outfit;
}

/** The next streak item still to earn, for "x more days" hints. */
export function nextStreakItem(
  earned: Set<ItemId>,
): (Item & { unlock: { streak: number } }) | undefined {
  return ITEMS.filter(
    (item): item is Item & { unlock: { streak: number } } => 'streak' in item.unlock,
  ).find((item) => !earned.has(item.id));
}
