import { describe, expect, it } from 'vitest';
import { annotate, contrastsFor, getPack, learnerPacks, type LanguagePack } from './packs';

const en: LanguagePack = {
  language: 'en',
  name: 'English',
  nativeName: 'English',
  direction: 'ltr',
  cognates: [{ nb: 'kollega', forms: ['kollega', 'kollegene'], meaning: 'colleague' }],
  falseFriends: [{ nb: 'sjef', forms: ['sjef', 'sjefen'], looksLike: 'chef', meaning: 'boss' }],
  contrasts: [],
};
const fr: LanguagePack = {
  ...en,
  language: 'fr',
  cognates: [{ nb: 'sjef', forms: ['sjef', 'sjefen'], meaning: 'patron' }],
  falseFriends: [],
};

describe('annotate', () => {
  it('marks cognates and false friends, keeping the original text', () => {
    const segments = annotate('Sjefen og kollegene.', [en]);
    expect(segments.map((s) => s.text).join('')).toBe('Sjefen og kollegene.');
    expect(segments.find((s) => s.text === 'Sjefen')?.word?.kind).toBe('false-friend');
    expect(segments.find((s) => s.text === 'kollegene')?.word?.kind).toBe('cognate');
    expect(segments.find((s) => s.text === 'og')?.word).toBeUndefined();
  });

  it('lets the first pack in priority order win', () => {
    expect(annotate('sjefen', [fr, en])[0]?.word).toMatchObject({
      kind: 'cognate',
      language: 'fr',
    });
    expect(annotate('sjefen', [en, fr])[0]?.word).toMatchObject({
      kind: 'false-friend',
      language: 'en',
    });
  });
});

describe('bundled packs', () => {
  it('include English and French', () => {
    expect(getPack('en')?.name).toBe('English');
    expect(getPack('fr')?.nativeName).toBe('Français');
  });
});

describe('learnerPacks', () => {
  it('puts the native language first and skips languages without a pack', () => {
    expect(learnerPacks('fr', ['en', 'fr', 'xx']).map((p) => p.language)).toEqual(['fr', 'en']);
    expect(learnerPacks('other', ['en']).map((p) => p.language)).toEqual(['en']);
    expect(learnerPacks(undefined)).toEqual([]);
  });
});

describe('contrastsFor', () => {
  it('keeps one note per contrast, from the highest-priority pack', () => {
    const notes = contrastsFor('a2-first-day-at-work', learnerPacks('en', ['fr']));
    const ids = notes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(notes.find((n) => n.id === 'verb-second')?.language).toBe('en');
    // Only the French pack has this one, so it comes from there.
    expect(notes.find((n) => n.id === 'definite-suffix')?.language).toBe('fr');
  });
});
