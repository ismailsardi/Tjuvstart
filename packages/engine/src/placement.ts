import { pickNextItem } from './picker';
import { DEFAULT_RATING, updateRating } from './rating';
import type { SessionItem } from './session';

/**
 * Placement check: a short adaptive test per skill. Items are chosen near a 50% expected
 * success, where each answer says the most about the learner, and the rating moves faster
 * than during normal practice so a few answers are enough.
 */

export const PLACEMENT_K = 64;
export const PLACEMENT_TARGET = 0.5;

export interface PlacementState {
  ratings: Record<string, number>;
  answered: Record<string, number>;
  seen: string[];
}

export function startPlacement(skills: readonly string[], start = DEFAULT_RATING): PlacementState {
  return {
    ratings: Object.fromEntries(skills.map((skill) => [skill, start])),
    answered: Object.fromEntries(skills.map((skill) => [skill, 0])),
    seen: [],
  };
}

/** The next item: the skill with the fewest answers so far, then the most informative item. */
export function nextPlacementItem<T extends SessionItem>(
  state: PlacementState,
  items: readonly T[],
  perSkill: number,
): T | undefined {
  const skills = Object.keys(state.ratings)
    .filter((skill) => (state.answered[skill] ?? 0) < perSkill)
    .filter((skill) => items.some((item) => item.skill === skill && !state.seen.includes(item.id)))
    .sort((a, b) => (state.answered[a] ?? 0) - (state.answered[b] ?? 0));
  const skill = skills[0];
  if (skill === undefined) return undefined;
  return pickNextItem(
    state.ratings[skill] ?? DEFAULT_RATING,
    items.filter((item) => item.skill === skill),
    { targetSuccess: PLACEMENT_TARGET, exclude: new Set(state.seen) },
  );
}

export function recordPlacementAnswer(
  state: PlacementState,
  item: SessionItem,
  correct: boolean,
): PlacementState {
  const rating = state.ratings[item.skill] ?? DEFAULT_RATING;
  return {
    ratings: {
      ...state.ratings,
      [item.skill]: updateRating(rating, item.difficulty, correct ? 1 : 0, { k: PLACEMENT_K }),
    },
    answered: { ...state.answered, [item.skill]: (state.answered[item.skill] ?? 0) + 1 },
    seen: [...state.seen, item.id],
  };
}
