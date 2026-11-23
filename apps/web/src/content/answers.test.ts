import { describe, expect, it } from 'vitest';
import { correctAnswer, dictationWords, isCorrect, normalize } from './answers';
import type { DictationItem, GapFillItem, MultipleChoiceItem, WordOrderItem } from './types';

const base = {
  skill: 'writing' as const,
  level: 'A2' as const,
  descriptors: ['A2-W-02'],
  difficulty: 1000,
};

const gap: GapFillItem = {
  ...base,
  id: 'g',
  type: 'gap-fill',
  prompt: 'Jeg ___ i Oslo.',
  answers: ['bor'],
};
const order: WordOrderItem = {
  ...base,
  id: 'w',
  type: 'word-order',
  prompt: 'Lag en setning.',
  tokens: ['har', 'vi', 'Etter lunsj', 'et møte'],
  answer: 'Etter lunsj har vi et møte',
};
const choice: MultipleChoiceItem = {
  ...base,
  skill: 'reading',
  id: 'm',
  type: 'multiple-choice',
  prompt: '?',
  options: ['a', 'b'],
  answer: 1,
};

describe('normalize', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalize('  Etter  lunsj, har vi ET møte! ')).toBe('etter lunsj har vi et møte');
  });
});

describe('isCorrect', () => {
  it('accepts gap-fill answers regardless of case and punctuation', () => {
    expect(isCorrect(gap, { kind: 'text', value: 'Bor.' })).toBe(true);
    expect(isCorrect(gap, { kind: 'text', value: 'bo' })).toBe(false);
  });

  it('checks word order exactly, apart from case and punctuation', () => {
    expect(isCorrect(order, { kind: 'text', value: 'Etter lunsj har vi et møte.' })).toBe(true);
    expect(isCorrect(order, { kind: 'text', value: 'Etter lunsj vi har et møte' })).toBe(false);
  });

  it('checks the chosen option', () => {
    expect(isCorrect(choice, { kind: 'choice', index: 1 })).toBe(true);
    expect(isCorrect(choice, { kind: 'choice', index: 0 })).toBe(false);
    expect(isCorrect(choice, { kind: 'text', value: 'b' })).toBe(false);
  });
});

describe('correctAnswer', () => {
  it('returns the text to show', () => {
    expect(correctAnswer(choice)).toBe('b');
    expect(correctAnswer(gap)).toBe('bor');
    expect(correctAnswer(order)).toBe('Etter lunsj har vi et møte');
  });
});

describe('dictation', () => {
  const item: DictationItem = {
    id: 'd',
    type: 'dictation',
    skill: 'listening',
    level: 'A2',
    descriptors: ['A2-L-01'],
    difficulty: 1000,
    prompt: 'Skriv det du hører.',
    audio: 'Jeg har vondt i ryggen.',
  };

  it('accepts the sentence without caring about case or punctuation', () => {
    expect(isCorrect(item, { kind: 'text', value: 'jeg har vondt i ryggen' })).toBe(true);
    expect(isCorrect(item, { kind: 'text', value: 'Jeg har vondt i rygen.' })).toBe(false);
    expect(correctAnswer(item)).toBe('Jeg har vondt i ryggen.');
  });

  it('marks the words the learner missed or misspelled', () => {
    expect(dictationWords('Jeg har vondt i ryggen.', 'jeg har vond i ryggen')).toEqual([
      { word: 'Jeg', ok: true },
      { word: 'har', ok: true },
      { word: 'vondt', ok: false },
      { word: 'i', ok: true },
      { word: 'ryggen.', ok: true },
    ]);
    expect(dictationWords('Vi var på hytta.', 'vi på hytta')).toEqual([
      { word: 'Vi', ok: true },
      { word: 'var', ok: false },
      { word: 'på', ok: true },
      { word: 'hytta.', ok: true },
    ]);
    expect(dictationWords('Hei!', '').map((w) => w.ok)).toEqual([false]);
  });
});
