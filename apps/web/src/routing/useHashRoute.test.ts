import { describe, expect, it } from 'vitest';
import { parseRoute } from './useHashRoute';

describe('parseRoute', () => {
  it('parses lesson routes', () => {
    expect(parseRoute('#/lesson/a2-first-day-at-work')).toEqual({
      name: 'lesson',
      lessonId: 'a2-first-day-at-work',
    });
  });

  it('falls back to home', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/unknown')).toEqual({ name: 'home' });
  });
});
