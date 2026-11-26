import { describe, expect, it } from 'vitest';
import {
  blankAnswer,
  checkAnswer,
  correctAnswer,
  dictationWords,
  isCorrect,
  normalize,
  optionOrder,
} from './answers';
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

describe('blankAnswer', () => {
  it('takes the blank out of a whole typed sentence', () => {
    expect(blankAnswer('Jeg ___ Sara.', 'Jeg er Sara.')).toBe('er');
    expect(blankAnswer('___ heter du?', 'Hva heter du')).toBe('hva');
    expect(blankAnswer('Hvor kommer du ___?', 'hvor kommer du fra?')).toBe('fra');
    expect(blankAnswer('Dere må svare ___ 10. mai.', 'Dere må svare innen 10. mai')).toBe('innen');
  });

  it('leaves a short answer, or a sentence that does not fit, as it is', () => {
    expect(blankAnswer('Jeg ___ Sara.', 'heter')).toBe('heter');
    expect(blankAnswer('Jeg ___ Sara.', 'Jeg Sara')).toBe('jeg sara');
    expect(blankAnswer('Jeg ___ Sara.', 'Du heter Sara')).toBe('du heter sara');
    expect(blankAnswer('Æ, ø, ___', 'å')).toBe('å');
  });
});

describe('isCorrect', () => {
  it('accepts a gap-fill typed as the whole sentence', () => {
    expect(isCorrect(gap, { kind: 'text', value: 'Jeg bor i Oslo.' })).toBe(true);
    expect(isCorrect(gap, { kind: 'text', value: 'Jeg jobber i Oslo.' })).toBe(false);
  });

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

describe('optionOrder', () => {
  it('is a permutation that stays the same for an item', () => {
    const order = optionOrder('a2-doc-01', 4);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(optionOrder('a2-doc-01', 4)).toEqual(order);
  });

  it('does not keep the first option first for most items', () => {
    const ids = Array.from({ length: 300 }, (_, n) => `item-${n}`);
    const firstStaysFirst = ids.filter((id) => optionOrder(id, 3)[0] === 0).length;
    expect(firstStaysFirst).toBeGreaterThan(60);
    expect(firstStaysFirst).toBeLessThan(140);
  });
});

describe('checkAnswer', () => {
  const gap: GapFillItem = {
    id: 'g-typo',
    type: 'gap-fill',
    skill: 'writing',
    level: 'A2',
    descriptors: ['A2-W-02'],
    difficulty: 1000,
    prompt: 'Jeg ___ med pasientene.',
    answers: ['hjelper'],
  };
  const text = (value: string) => ({ kind: 'text', value }) as const;

  it('forgives a slip of the finger and says how it should be spelled', () => {
    expect(checkAnswer(gap, text('Hjlper'))).toEqual({
      correct: true,
      spelling: 'typo',
      meant: 'hjelper',
    });
    expect(checkAnswer(gap, text('hjelper.'))).toEqual({ correct: true, spelling: 'exact' });
  });

  it('forgives a slip in a whole typed sentence too', () => {
    expect(checkAnswer(gap, text('Jeg hjlper med pasientene.'))).toEqual({
      correct: true,
      spelling: 'typo',
      meant: 'hjelper',
    });
  });

  it('does not forgive a different verb form', () => {
    expect(checkAnswer(gap, text('hjelpet')).correct).toBe(false);
    expect(checkAnswer(gap, text('hjelpe')).correct).toBe(false);
  });

  it('accepts æ, ø and å typed without the letters, except in spelling exercises', () => {
    const item: GapFillItem = { ...gap, answers: ['går'] };
    expect(checkAnswer(item, text('gaar'))).toMatchObject({ correct: true, spelling: 'letters' });
    expect(checkAnswer({ ...item, focus: ['sounds-spelling'] }, text('gar')).correct).toBe(false);
  });
});
