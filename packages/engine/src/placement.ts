import { pickNextItem } from './picker';
import { DEFAULT_RATING, expectedScore } from './rating';
import type { SessionItem } from './session';

/**
 * Placement check: a short adaptive test per skill. Items are chosen near a 50% expected
 * success, where each answer says the most about the learner. After each answer the estimate
 * is worked out again from all answers so far (a Bayesian posterior over the rating scale), so
 * lucky guesses on multiple choice count for less and the check knows how sure it is. A skill
 * stops as soon as its estimate is precise enough, or after a maximum number of questions.
 */

export const PLACEMENT_TARGET = 0.5;

/** What the check assumes before any answer: most learners who take it are around A2. */
export const PLACEMENT_PRIOR = { mean: DEFAULT_RATING, sd: 250 };

/**
 * How far one learner's skills usually sit from each other, in rating points. Answers in the
 * other skills inform each skill's starting point by this much, so a learner who aces reading
 * starts writing higher too.
 */
export const SKILL_SPREAD = 150;

export interface PlacementOptions {
  /** Questions every skill gets, however sure the estimate looks. */
  min?: number;
  /** Questions after which a skill stops anyway. */
  max?: number;
  /**
   * Uncertainty (posterior standard deviation, in rating points) below which a skill's
   * estimate counts as precise enough. CEFR bands are 200 points wide.
   */
  targetError?: number;
}

export const PLACEMENT_DEFAULTS: Required<PlacementOptions> = { min: 3, max: 5, targetError: 150 };

export interface PlacementAnswer {
  difficulty: number;
  guess: number;
  correct: boolean;
}

export interface PlacementState {
  /** Current estimate per skill. */
  ratings: Record<string, number>;
  /** Posterior standard deviation per skill, in rating points. */
  errors: Record<string, number>;
  answers: Record<string, PlacementAnswer[]>;
  seen: string[];
}

export function startPlacement(skills: readonly string[]): PlacementState {
  return {
    ratings: Object.fromEntries(skills.map((skill) => [skill, PLACEMENT_PRIOR.mean])),
    errors: Object.fromEntries(skills.map((skill) => [skill, PLACEMENT_PRIOR.sd])),
    answers: Object.fromEntries(skills.map((skill) => [skill, []])),
    seen: [],
  };
}

// The rating scale the posterior is worked out on, wide enough for A1 to beyond B2.
const GRID = Array.from({ length: 121 }, (_, i) => 400 + i * 10);

/** Posterior mean and standard deviation of the rating, given the answers so far. */
export function estimate(
  answers: readonly PlacementAnswer[],
  prior: { mean: number; sd: number } = PLACEMENT_PRIOR,
): { mean: number; sd: number } {
  const { mean: m, sd: s } = prior;
  const logWeights = GRID.map((theta) => {
    let log = -((theta - m) ** 2) / (2 * s * s);
    for (const a of answers) {
      const p = expectedScore(theta, a.difficulty, a.guess);
      log += Math.log(a.correct ? p : 1 - p);
    }
    return log;
  });
  const top = Math.max(...logWeights);
  const weights = logWeights.map((log) => Math.exp(log - top));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const mean = GRID.reduce((sum, theta, i) => sum + theta * weights[i]!, 0) / total;
  const variance =
    GRID.reduce((sum, theta, i) => sum + (theta - mean) ** 2 * weights[i]!, 0) / total;
  return { mean, sd: Math.sqrt(variance) };
}

/** Whether a skill needs no more questions. */
export function skillPlaced(
  state: PlacementState,
  skill: string,
  options: PlacementOptions = {},
): boolean {
  const { min, max, targetError } = { ...PLACEMENT_DEFAULTS, ...options };
  const answered = state.answers[skill]?.length ?? 0;
  return (
    answered >= max ||
    (answered >= min && (state.errors[skill] ?? PLACEMENT_PRIOR.sd) <= targetError)
  );
}

/** The most questions the check can ask, to tell the learner up front. */
export function maxPlacementQuestions(
  skills: readonly string[],
  options: PlacementOptions = {},
): number {
  return skills.length * { ...PLACEMENT_DEFAULTS, ...options }.max;
}

/** The next item: the unplaced skill with the fewest answers so far, then the most informative item. */
export function nextPlacementItem<T extends SessionItem>(
  state: PlacementState,
  items: readonly T[],
  options: PlacementOptions = {},
): T | undefined {
  const answered = (skill: string) => state.answers[skill]?.length ?? 0;
  const skills = Object.keys(state.ratings)
    .filter((skill) => !skillPlaced(state, skill, options))
    .filter((skill) => items.some((item) => item.skill === skill && !state.seen.includes(item.id)))
    .sort((a, b) => answered(a) - answered(b));
  const skill = skills[0];
  if (skill === undefined) return undefined;
  return pickNextItem(
    state.ratings[skill] ?? DEFAULT_RATING,
    items.filter((item) => item.skill === skill),
    { targetSuccess: PLACEMENT_TARGET, exclude: new Set(state.seen) },
  );
}

/**
 * Records one answer and works out the skill's estimate again. `guess` is the chance of a
 * right answer by luck (1/3 for three options).
 */
export function recordPlacementAnswer(
  state: PlacementState,
  item: SessionItem,
  correct: boolean,
  guess = 0,
): PlacementState {
  const answers = {
    ...state.answers,
    [item.skill]: [
      ...(state.answers[item.skill] ?? []),
      { difficulty: item.difficulty, guess, correct },
    ],
  };
  // Every skill's estimate can change: its prior comes from the answers in the other skills.
  const ratings: Record<string, number> = {};
  const errors: Record<string, number> = {};
  for (const skill of Object.keys(state.ratings)) {
    const others = Object.entries(answers)
      .filter(([other]) => other !== skill)
      .flatMap(([, list]) => list);
    const general = estimate(others);
    const prior = { mean: general.mean, sd: Math.hypot(general.sd, SKILL_SPREAD) };
    const { mean, sd } = estimate(answers[skill] ?? [], prior);
    ratings[skill] = mean;
    errors[skill] = sd;
  }
  return { ratings, errors, answers, seen: [...state.seen, item.id] };
}
