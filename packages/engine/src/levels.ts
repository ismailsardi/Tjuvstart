/**
 * Mapping between CEFR levels and the rating scale.
 *
 * Each level is centred on a base rating 200 points apart, so a learner rated
 * at a level's base has about a 50% chance on items authored at that level and
 * about 76% on items one level below.
 */

export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_BASE: Readonly<Record<Level, number>> = {
  A1: 800,
  A2: 1000,
  B1: 1200,
  B2: 1400,
};

/** Answers needed in a skill before the app shows a level for it. */
export const MIN_ANSWERS_FOR_ESTIMATE = 5;

/** The CEFR level whose band contains `rating`. Bands run 100 points either side of each base. */
export function ratingToLevel(rating: number): Level {
  for (const level of [...LEVELS].reverse()) {
    if (rating >= LEVEL_BASE[level] - 100) return level;
  }
  return 'A1';
}
