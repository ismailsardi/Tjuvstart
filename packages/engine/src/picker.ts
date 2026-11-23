import { expectedScore } from './rating';

export interface Item {
  id: string;
  difficulty: number;
}

export interface PickOptions {
  /** Success probability to aim for. Most items should be answered right, not all. */
  targetSuccess?: number;
  /** Item ids to leave out, for example ones seen in this session. */
  exclude?: ReadonlySet<string>;
}

/**
 * Picks the item whose expected success rate is closest to the target.
 * Ties go to the first item in the list, so results are deterministic.
 */
export function pickNextItem<T extends Item>(
  ability: number,
  items: readonly T[],
  { targetSuccess = 0.8, exclude = new Set() }: PickOptions = {},
): T | undefined {
  let best: T | undefined;
  let bestGap = Infinity;
  for (const item of items) {
    if (exclude.has(item.id)) continue;
    const gap = Math.abs(expectedScore(ability, item.difficulty) - targetSuccess);
    if (gap < bestGap) {
      best = item;
      bestGap = gap;
    }
  }
  return best;
}
