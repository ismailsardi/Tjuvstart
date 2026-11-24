import { describe, expect, it } from 'vitest';
import {
  allowedTypos,
  compareSpelling,
  editDistance,
  isTypo,
  sameExceptSpecialLetters,
} from './spelling';

const known = new Set(['bor', 'bo', 'jobber', 'jobbet', 'huset', 'huser', 'ga', 'gå', 'sove']);

describe('editDistance', () => {
  it('counts insertions, deletions, substitutions and swapped neighbours as one edit', () => {
    expect(editDistance('kaffe', 'kaffe')).toBe(0);
    expect(editDistance('kaffe', 'kafe')).toBe(1);
    expect(editDistance('kaffe', 'kaffee')).toBe(1);
    expect(editDistance('kaffe', 'kaffa')).toBe(1);
    expect(editDistance('hjelpe', 'hjlepe')).toBe(1);
    expect(editDistance('sykehus', 'sykhuse')).toBe(2);
  });
});

describe('typos', () => {
  it('allows none in short words, one in medium words and two in long ones', () => {
    expect(allowedTypos(3)).toBe(0);
    expect(allowedTypos(6)).toBe(1);
    expect(allowedTypos(10)).toBe(2);
  });

  it('forgives a slip in the middle of a word', () => {
    expect(isTypo('hjelpe', 'hjlepe', known)).toBe(true);
    expect(isTypo('leilighet', 'leilihet', known)).toBe(true);
  });

  it('never forgives a different known word or a changed ending', () => {
    expect(isTypo('jobber', 'jobbet', known)).toBe(false);
    expect(isTypo('huset', 'huser', known)).toBe(false);
    expect(isTypo('kontoret', 'kontoren', known)).toBe(false);
    expect(isTypo('bor', 'bo', known)).toBe(false);
  });
});

describe('æ, ø and å', () => {
  it('accepts them typed as ae, oe, aa or the plain letter', () => {
    expect(sameExceptSpecialLetters('lærer', 'laerer')).toBe(true);
    expect(sameExceptSpecialLetters('lærer', 'larer')).toBe(true);
    expect(sameExceptSpecialLetters('brød', 'broed')).toBe(true);
    expect(sameExceptSpecialLetters('brød', 'brod')).toBe(true);
    expect(sameExceptSpecialLetters('går', 'gaar')).toBe(true);
    expect(sameExceptSpecialLetters('går', 'gar')).toBe(true);
  });

  it('only stands in for those letters', () => {
    expect(sameExceptSpecialLetters('går', 'gor')).toBe(false);
    expect(sameExceptSpecialLetters('bil', 'bil')).toBe(false);
  });
});

describe('compareSpelling', () => {
  it('tells exact answers, missing letters, typos and wrong answers apart', () => {
    expect(compareSpelling('kaffe', 'kaffe', known)).toBe('exact');
    expect(compareSpelling('på jobben', 'pa jobben', known)).toBe('letters');
    expect(compareSpelling('hjelpe', 'hjlepe', known)).toBe('typo');
    expect(compareSpelling('jobber', 'jobbet', known)).toBe('wrong');
    expect(compareSpelling('en time', 'time', known)).toBe('wrong');
  });

  it('allows one typo per five words in a sentence, and at least one', () => {
    const sentence = 'jeg må hente barnet i barnehagen klokka fire';
    expect(compareSpelling(sentence, 'jeg ma hente barnet i barnehgaen klokka fire', known)).toBe(
      'typo',
    );
    expect(compareSpelling(sentence, 'jeg må hnete barnet i barnehgaen klokka fire', known)).toBe(
      'wrong',
    );
  });

  it('can be strict', () => {
    expect(compareSpelling('går', 'gar', known, { forgiving: false })).toBe('wrong');
  });
});
