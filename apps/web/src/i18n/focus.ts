import type { StringKey } from './strings';

/** The string key for a focus point's name, e.g. "v2-word-order" → "focus_v2_word_order". */
export function focusKey(focus: string): StringKey {
  return `focus_${focus.replaceAll('-', '_')}` as StringKey;
}
