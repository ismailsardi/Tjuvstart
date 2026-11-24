/**
 * Forgiving checks for typed answers. A slip of the finger should not count as a mistake, but
 * a different word, a different gender or a different verb ending should. Everything here
 * works on text that has already been through `normalize` (lower case, no punctuation).
 */

export type Spelling = 'exact' | 'letters' | 'typo' | 'wrong';

/**
 * Optimal string alignment distance: insertions, deletions, substitutions and swaps of two
 * neighbouring letters each count as one edit.
 */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[a.length]![b.length]!;
}

/** Typos allowed in a word of this length: none up to 3 letters, one up to 7, then two. */
export function allowedTypos(length: number): number {
  return length <= 3 ? 0 : length <= 7 ? 1 : 2;
}

const SPECIAL: Record<string, string> = { æ: '(?:æ|ae|a|e)', ø: '(?:ø|oe|o)', å: '(?:å|aa|a)' };

/**
 * Whether `given` is `expected` typed without æ, ø or å, as ae/oe/aa or as the plain letter,
 * which is what people do on a keyboard without them.
 */
export function sameExceptSpecialLetters(expected: string, given: string): boolean {
  if (!/[æøå]/.test(expected)) return false;
  const pattern = [...expected]
    .map((c) => SPECIAL[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
  return new RegExp(`^${pattern}$`).test(given);
}

/** The ending is where Norwegian keeps gender, number and tense: en/et, -er/-et, -en/-ene. */
const ENDING = 2;

/**
 * Whether `given` is a slip of the finger for the word `expected`: close enough, not a known
 * word in its own right, and with the ending intact so a grammar mistake is never waved through.
 */
export function isTypo(expected: string, given: string, known: ReadonlySet<string>): boolean {
  if (known.has(given)) return false;
  const allowed = allowedTypos(expected.length);
  if (allowed === 0) return false;
  if (editDistance(expected, given) > allowed) return false;
  return (
    expected.length > ENDING &&
    given.length > ENDING &&
    expected.slice(-ENDING) === given.slice(-ENDING)
  );
}

/**
 * Compares a typed answer with one accepted answer, word by word. Each word may be written
 * without æ, ø and å; a typo is allowed in about one word in five, and never in short words.
 */
export function compareSpelling(
  expected: string,
  given: string,
  known: ReadonlySet<string>,
  { forgiving = true }: { forgiving?: boolean } = {},
): Spelling {
  if (expected === given) return 'exact';
  if (!forgiving) return 'wrong';
  const want = expected.split(' ');
  const got = given.split(' ');
  if (want.length !== got.length) return 'wrong';

  let typos = 0;
  let letters = false;
  for (const [i, word] of want.entries()) {
    const typed = got[i]!;
    if (typed === word) continue;
    if (sameExceptSpecialLetters(word, typed)) {
      letters = true;
    } else if (isTypo(word, typed, known)) {
      typos++;
    } else {
      return 'wrong';
    }
  }
  if (typos > Math.max(1, Math.floor(want.length / 5))) return 'wrong';
  return typos > 0 ? 'typo' : letters ? 'letters' : 'exact';
}
