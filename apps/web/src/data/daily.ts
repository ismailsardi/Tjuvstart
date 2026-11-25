/** Word cards in the daily session: about ten seconds each. */
export const DAILY_CARDS = 10;
/** Exercises in the daily session: well under a minute each. */
export const DAILY_ITEMS = 8;

/**
 * Daily goal sizes the learner can pick, in answers, card reviews and shadowed sentences.
 * Regular is the engine's default; serious is about one full daily session.
 */
export const GOAL_SIZES = { light: 5, regular: 8, serious: 18 } as const;
export type GoalSize = keyof typeof GOAL_SIZES;
export const DEFAULT_GOAL: GoalSize = 'regular';
