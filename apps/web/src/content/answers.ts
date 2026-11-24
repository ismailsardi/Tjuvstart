import type { Item } from './types';

/** Lower-case, trim, collapse spaces and drop sentence punctuation, so "Bor." matches "bor". */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('nb')
    .replace(/[.,!?;:«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type Response = { kind: 'choice'; index: number } | { kind: 'text'; value: string };

export function isCorrect(item: Item, response: Response): boolean {
  switch (item.type) {
    case 'multiple-choice':
      return response.kind === 'choice' && response.index === item.answer;
    case 'gap-fill':
      return (
        response.kind === 'text' &&
        item.answers.some((answer) => normalize(answer) === normalize(response.value))
      );
    case 'word-order':
      return response.kind === 'text' && normalize(response.value) === normalize(item.answer);
    case 'dictation':
      return response.kind === 'text' && normalize(response.value) === normalize(item.audio);
  }
}

/** The answer to show after a wrong attempt. */
export function correctAnswer(item: Item): string {
  switch (item.type) {
    case 'multiple-choice':
      return item.options[item.answer] ?? '';
    case 'gap-fill':
      return item.answers[0] ?? '';
    case 'word-order':
      return item.answer;
    case 'dictation':
      return item.audio;
  }
}

/**
 * Marks each word of the expected sentence as heard or missed, by lining up the learner's
 * words with it (longest common subsequence). Used to show which words a dictation missed.
 */
export function dictationWords(expected: string, given: string): { word: string; ok: boolean }[] {
  const shown = expected.split(/\s+/).filter(Boolean);
  const want = shown.map(normalize);
  const got = normalize(given).split(' ').filter(Boolean);
  // lengths[i][j]: common words in want[i..] and got[j..].
  const lengths = Array.from({ length: want.length + 1 }, () =>
    Array<number>(got.length + 1).fill(0),
  );
  for (let i = want.length - 1; i >= 0; i--) {
    for (let j = got.length - 1; j >= 0; j--) {
      lengths[i]![j] =
        want[i] === got[j]
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }
  const result: { word: string; ok: boolean }[] = [];
  let i = 0;
  let j = 0;
  while (i < want.length) {
    if (j < got.length && want[i] === got[j]) {
      result.push({ word: shown[i]!, ok: true });
      i++;
      j++;
    } else if (j < got.length && lengths[i]![j + 1]! >= lengths[i + 1]![j]!) {
      j++; // an extra or misspelled word the learner typed
    } else {
      result.push({ word: shown[i]!, ok: false });
      i++;
    }
  }
  return result;
}

/**
 * A stable shuffle of option indexes for one item, seeded by its id. Authors put the right
 * answer first; the learner should not be able to rely on that, but the order must not jump
 * around between renders or sessions either.
 */
export function optionOrder(itemId: string, count: number): number[] {
  // FNV-1a hash of the id, then a small xorshift generator for a Fisher-Yates shuffle.
  let seed = 0x811c9dc5;
  for (let i = 0; i < itemId.length; i++) {
    seed ^= itemId.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193) >>> 0;
  }
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed;
  };
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}
