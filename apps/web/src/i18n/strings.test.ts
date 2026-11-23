import { describe, expect, it } from 'vitest';
import { translate, uiLanguageFor } from './strings';

describe('translate', () => {
  it('fills in variables', () => {
    expect(translate('en', 'question', { n: 2, total: 15 })).toBe('Question 2 of 15');
    expect(translate('fr', 'question', { n: 2, total: 15 })).toBe('Question 2 sur 15');
  });
});

describe('uiLanguageFor', () => {
  it('uses French for French speakers and English otherwise', () => {
    expect(uiLanguageFor('fr')).toBe('fr');
    expect(uiLanguageFor('en')).toBe('en');
    expect(uiLanguageFor('de')).toBe('en');
    expect(uiLanguageFor(undefined)).toBe('en');
  });
});
