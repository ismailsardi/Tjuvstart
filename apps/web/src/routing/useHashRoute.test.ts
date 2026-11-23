import { describe, expect, it } from 'vitest';
import { parseRoute } from './useHashRoute';

describe('parseRoute', () => {
  it('parses lesson routes', () => {
    expect(parseRoute('#/lesson/a2-first-day-at-work')).toEqual({
      name: 'lesson',
      lessonId: 'a2-first-day-at-work',
    });
  });

  it('parses shadowing routes', () => {
    expect(parseRoute('#/shadow/a2-first-day-at-work')).toEqual({
      name: 'shadow',
      lessonId: 'a2-first-day-at-work',
    });
  });

  it('parses tab and deck routes', () => {
    expect(parseRoute('#/words')).toEqual({ name: 'words' });
    expect(parseRoute('#/words/a2-work')).toEqual({ name: 'deck', deckId: 'a2-work' });
    expect(parseRoute('#/review')).toEqual({ name: 'deck', deckId: 'due' });
    expect(parseRoute('#/me')).toEqual({ name: 'me' });
  });

  it('falls back to home', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/unknown')).toEqual({ name: 'home' });
  });
});
