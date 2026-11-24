/** Types mirror content/schema/l1-pack.schema.json. */

export interface PackWord {
  nb: string;
  forms: string[];
  meaning: string;
  looksLike?: string;
}

export interface Contrast {
  id: string;
  title: string;
  body: string;
  lessons: string[];
}

export interface LanguagePack {
  language: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  /** Whether a speaker of the language has checked the translations. Missing means approved. */
  review?: 'pending' | 'approved';
  cognates: PackWord[];
  falseFriends: PackWord[];
  contrasts: Contrast[];
  itemNotes?: Record<string, string>;
  lessonSummaries?: Record<string, string>;
  trackSummaries?: Record<string, string>;
  /** First-person can-do statements, keyed by descriptor id. */
  canDo?: Record<string, string>;
  /** Word card meanings and memory hooks, keyed by card id. */
  words?: Record<string, { meaning: string; hook?: string }>;
}

const modules = import.meta.glob<LanguagePack>('../../../../content/l1/*/pack.json', {
  eager: true,
  import: 'default',
});

export const packs: readonly LanguagePack[] = Object.values(modules);

export function getPack(language: string | undefined): LanguagePack | undefined {
  return packs.find((pack) => pack.language === language);
}

/** The learner's packs in priority order: native language first, then other known languages. */
export function learnerPacks(
  nativeLanguage: string | undefined,
  knownLanguages: readonly string[] = [],
): LanguagePack[] {
  const codes = [...new Set([nativeLanguage, ...knownLanguages])];
  return codes.map(getPack).filter((pack): pack is LanguagePack => pack !== undefined);
}

/** Contrast notes for a lesson, one per contrast id, taken from the highest-priority pack. */
export function contrastsFor(
  lessonId: string,
  priority: readonly LanguagePack[],
): (Contrast & { language: string; direction: LanguagePack['direction'] })[] {
  const seen = new Set<string>();
  return priority.flatMap((pack) =>
    pack.contrasts
      .filter((contrast) => contrast.lessons.includes(lessonId) && !seen.has(contrast.id))
      .map((contrast) => {
        seen.add(contrast.id);
        return { ...contrast, language: pack.language, direction: pack.direction };
      }),
  );
}

/** The first pack in priority order that has a value for the key, e.g. an item note. */
export function firstNote(
  priority: readonly LanguagePack[],
  pick: (pack: LanguagePack) => string | undefined,
): { text: string; pack: LanguagePack } | undefined {
  for (const pack of priority) {
    const text = pick(pack);
    if (text) return { text, pack };
  }
  return undefined;
}

export type WordKind = 'cognate' | 'false-friend';

export interface Segment {
  text: string;
  word?: PackWord & { kind: WordKind; language: string };
}

/**
 * Splits a Norwegian text into segments and marks words found in the learner's packs.
 * Packs are given in priority order (native language first), and the first match wins.
 */
export function annotate(text: string, priority: readonly LanguagePack[]): Segment[] {
  const lookup = new Map<string, NonNullable<Segment['word']>>();
  for (const pack of priority) {
    const entries: [PackWord, WordKind][] = [
      ...pack.falseFriends.map((w): [PackWord, WordKind] => [w, 'false-friend']),
      ...pack.cognates.map((w): [PackWord, WordKind] => [w, 'cognate']),
    ];
    for (const [word, kind] of entries) {
      for (const form of word.forms) {
        if (!lookup.has(form)) lookup.set(form, { ...word, kind, language: pack.language });
      }
    }
  }

  return text
    .split(/([A-Za-zÆØÅÉæøåé]+)/)
    .filter((part) => part !== '')
    .map((part) => {
      const word = lookup.get(part.toLocaleLowerCase('nb'));
      return word ? { text: part, word } : { text: part };
    });
}
