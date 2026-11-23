/**
 * Can-do statements. Each CEFR descriptor is tagged on several items; the learner can do it
 * once they have answered enough different items for it and most of their latest answers are
 * right. Only the latest answer to each item counts, so an item answered wrong and then right
 * counts as right.
 */

export const CAN_DO_MIN_ITEMS = 3;
export const CAN_DO_ACCURACY = 0.8;

export type CanDoStatus = 'not-started' | 'practising' | 'can-do';

/** `latest` holds the latest answer to each distinct item tagged with the descriptor. */
export function canDoStatus(latest: readonly boolean[]): CanDoStatus {
  if (latest.length === 0) return 'not-started';
  const right = latest.filter(Boolean).length;
  return latest.length >= CAN_DO_MIN_ITEMS && right / latest.length >= CAN_DO_ACCURACY
    ? 'can-do'
    : 'practising';
}
