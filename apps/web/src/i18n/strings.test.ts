import { describe, expect, it } from 'vitest';
import { translate, uiLanguageFor } from './strings';

describe('translate', () => {
  it('fills in variables', () => {
    expect(translate('en', 'question', { n: 2, total: 15 })).toBe('Question 2 of 15');
    expect(translate('fr', 'question', { n: 2, total: 15 })).toBe('Question 2 sur 15');
    expect(translate('de', 'question', { n: 2, total: 15 })).toBe('Frage 2 von 15');
  });
});

describe('uiLanguageFor', () => {
  it('uses the native language when the interface exists in it, English otherwise', () => {
    expect(uiLanguageFor('fr')).toBe('fr');
    expect(uiLanguageFor('de')).toBe('de');
    expect(uiLanguageFor('en')).toBe('en');
    expect(uiLanguageFor('ar')).toBe('en');
    expect(uiLanguageFor('toString')).toBe('en');
    expect(uiLanguageFor(undefined)).toBe('en');
  });
});
