/**
 * Elo-style ability rating, kept per learner and per skill.
 *
 * Learner ability and item difficulty share one scale, so the expected
 * chance of a correct answer is a logistic function of their difference.
 * See docs/adr/0003-elo-rating-before-irt.md for why this comes before IRT.
 */

export const DEFAULT_RATING = 1000;

/** Rating points that separate a 50% chance from roughly a 76% chance. */
const SCALE = 400;

export interface RatingOptions {
  /** How far a single answer can move the learner's rating. */
  k?: number;
}

/** Probability (0..1) that a learner at `ability` answers an item at `difficulty` correctly. */
export function expectedScore(ability: number, difficulty: number): number {
  return 1 / (1 + 10 ** ((difficulty - ability) / SCALE));
}

/**
 * New learner rating after one answer.
 * `score` is 1 for correct, 0 for wrong, or a partial value for graded answers.
 */
export function updateRating(
  ability: number,
  difficulty: number,
  score: number,
  { k = 32 }: RatingOptions = {},
): number {
  if (score < 0 || score > 1 || Number.isNaN(score)) {
    throw new RangeError(`score must be between 0 and 1, got ${score}`);
  }
  return ability + k * (score - expectedScore(ability, difficulty));
}
