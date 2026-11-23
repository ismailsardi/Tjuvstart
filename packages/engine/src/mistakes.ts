/**
 * Error memory: which focus points (grammar or usage, such as V2 word order) a learner
 * keeps getting wrong. A mistake adds more weight than a correct answer removes, so a
 * point stays "recurring" until it has been answered right a few times.
 */

export interface TaggedAnswer {
  /** Focus points the item practises. */
  focus: readonly string[];
  correct: boolean;
}

export const MISTAKE_WEIGHT = 2;
export const RECOVERY_WEIGHT = 1;
/** Score from which a focus point counts as a recurring mistake. */
export const RECURRING_THRESHOLD = 2;

/** Scores per focus point, from answers in chronological order. */
export function mistakeScores(answers: Iterable<TaggedAnswer>): Map<string, number> {
  const scores = new Map<string, number>();
  for (const answer of answers) {
    for (const focus of answer.focus) {
      const previous = scores.get(focus) ?? 0;
      const next = answer.correct ? previous - RECOVERY_WEIGHT : previous + MISTAKE_WEIGHT;
      scores.set(focus, Math.max(0, next));
    }
  }
  return scores;
}

/** Focus points at or above the threshold, worst first. */
export function recurringMistakes(scores: ReadonlyMap<string, number>): string[] {
  return [...scores]
    .filter(([, score]) => score >= RECURRING_THRESHOLD)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([focus]) => focus);
}
