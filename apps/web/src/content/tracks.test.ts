import { describe, expect, it } from 'vitest';
import { nextInTrack, trackedLessonIds, trackLessons, tracks } from './tracks';

describe('tracks', () => {
  const firstWeeks = tracks.find((t) => t.id === 'first-weeks')!;

  it('lists the first-weeks scenarios in order', () => {
    expect(trackLessons(firstWeeks).map((l) => l.id)).toEqual([
      'a2-first-day-at-work',
      'a2-tax-card',
      'a2-bankid',
      'a2-renting-a-flat',
      'a2-doctor',
      'a2-lunch-small-talk',
    ]);
    expect(trackedLessonIds.has('a2-doctor')).toBe(true);
    expect(trackedLessonIds.has('a2-getting-around')).toBe(false);
  });

  it('suggests the first lesson not yet completed', () => {
    expect(nextInTrack(firstWeeks, new Set())?.id).toBe('a2-first-day-at-work');
    expect(nextInTrack(firstWeeks, new Set(['a2-first-day-at-work', 'a2-bankid']))?.id).toBe(
      'a2-tax-card',
    );
    expect(nextInTrack(firstWeeks, new Set(firstWeeks.lessons))).toBeUndefined();
  });
});
