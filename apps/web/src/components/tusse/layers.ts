import type { TussePose } from '../Tusse';
import type { ItemId, Outfit } from '../outfits';
import { SLOTS } from '../outfits';

/**
 * Outfit pieces for the illustrated troll. Each item is one transparent image per pose, drawn in
 * the pose's own 800 × 880 art space so it lines up with the body pixel for pixel. The cape also
 * has a part that hangs behind the body.
 *
 * Layers come in three groups, because each moves with a different part of the rig:
 * - back: behind the body, moves with the body only (the cape);
 * - body: follows the fur it covers, arms and tail included (clothes, slippers, scarf, cape ties);
 * - head: moves with the head as one piece (hats, glasses).
 */
export type LayerGroup = 'back' | 'body' | 'head';

/** Front-to-back drawing order within each group. */
const ORDER: Record<LayerGroup, readonly ItemId[]> = {
  back: ['cape'],
  body: ['slippers', 'sweater', 'anorak', 'scarf', 'cape'],
  head: ['glasses', 'lue', 'helmet'],
};

export const GROUPS: readonly LayerGroup[] = ['back', 'body', 'head'];

/** Poses without a cape behind them (the sleeping troll wears it as a blanket instead). */
const NO_BACK: readonly TussePose[] = ['sleep'];

/** Pieces a pose doesn't show: curled up asleep, the scarf is tucked away. */
const HIDDEN: Partial<Record<TussePose, readonly ItemId[]>> = { sleep: ['scarf'] };

/** The image files to draw for one group, bottom first. */
export function layerFiles(outfit: Outfit, pose: TussePose, group: LayerGroup): string[] {
  const worn = new Set(SLOTS.map((slot) => outfit[slot]).filter(Boolean));
  if (group === 'back' && NO_BACK.includes(pose)) return [];
  return ORDER[group]
    .filter((item) => worn.has(item) && !HIDDEN[pose]?.includes(item))
    .map((item) => `${pose}-${item}${group === 'back' ? '-back' : ''}.webp`);
}

/** Hats, which hide the hair: while one is worn, the hair that would poke through is cut away. */
const HATS: readonly ItemId[] = ['lue', 'helmet'];

function hatOf(outfit: Outfit): ItemId | undefined {
  return HATS.find((hat) => SLOTS.some((slot) => outfit[slot] === hat));
}

/** The mask of hair to cut from the rig's art under the hat worn, if any. */
export function hairCutFile(outfit: Outfit, pose: TussePose): string | undefined {
  const hat = hatOf(outfit);
  return hat && `${pose}-${hat}-cut.png`;
}

/** The still with that hair already cut, if a hat is worn. */
export function hatStillFile(outfit: Outfit, pose: TussePose): string | undefined {
  const hat = hatOf(outfit);
  return hat && `${pose}-${hat}-still.webp`;
}

export function layerUrl(base: string, file: string): string {
  return `${base}troll/rig/outfit/${file}`;
}

/** A stable key for what is worn, so a change of clothes can be noticed. */
export function outfitKey(outfit: Outfit): string {
  return SLOTS.map((slot) => outfit[slot] ?? '').join('|');
}
