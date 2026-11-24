import { useLiveQuery } from 'dexie-react-hooks';
import { LEVELS, MIN_ANSWERS_FOR_ESTIMATE, ratingToLevel } from '@tjuvstart/engine';
import { SKILLS } from '../content/types';
import type { Profile } from '../data/db';
import { getProfile } from '../data/progress';
import type { TusseGear } from './Tusse';

/**
 * Tusse's gear follows the learner's best estimated skill: the horned helmet at A2,
 * a lusekofte as well at B1. A skill counts once it has an estimate, from enough
 * answers or from the level check.
 */
export function gearFor(profile: Profile | undefined): TusseGear {
  if (!profile) return {};
  let best = -1;
  for (const skill of SKILLS) {
    const rating = profile.ratings[skill];
    const estimated =
      rating !== undefined &&
      ((profile.answers[skill] ?? 0) >= MIN_ANSWERS_FOR_ESTIMATE || profile.placedAt !== undefined);
    if (estimated) best = Math.max(best, LEVELS.indexOf(ratingToLevel(rating)));
  }
  return { helmet: best >= LEVELS.indexOf('A2'), sweater: best >= LEVELS.indexOf('B1') };
}

export function useTusseGear(): TusseGear {
  return gearFor(useLiveQuery(() => getProfile()));
}
