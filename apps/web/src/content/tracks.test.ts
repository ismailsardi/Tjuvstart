import { describe, expect, it } from 'vitest';
import {
  nextInTrack,
  overallLevel,
  suggestedTracks,
  trackedLessonIds,
  trackLessons,
  tracks,
} from './tracks';

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

describe('suggested tracks', () => {
  const none = { reading: 0, listening: 0, writing: 0, speaking: 0 };
  const flat = (rating: number) => ({
    reading: rating,
    listening: rating,
    writing: rating,
    speaking: rating,
  });

  it('assumes A2 until the learner has answered something', () => {
    expect(overallLevel(flat(1000), none)).toBe('A2');
  });

  it('assumes A1 for a learner who said they are starting from zero', () => {
    expect(overallLevel(flat(1000), none, 'beginner')).toBe('A1');
    expect(overallLevel(flat(1000), none, 'some')).toBe('A2');
  });

  it('averages only the skills with answers', () => {
    const ratings = { ...flat(1000), reading: 760, listening: 780 };
    expect(overallLevel(ratings, { ...none, reading: 5, listening: 5 })).toBe('A1');
    expect(overallLevel(flat(1000), { ...none, reading: 5 })).toBe('A2');
  });

  it('starts beginners on the from-zero track and keeps it from everyone else', () => {
    expect(suggestedTracks('A1')[0]?.id).toBe('from-zero');
    expect(suggestedTracks('A2').map((t) => t.id)).not.toContain('from-zero');
    expect(suggestedTracks('A2')[0]?.id).toBe('first-weeks');
  });

  it('ends with the B1 tracks, each holding only B1 lessons', () => {
    const b1 = tracks.filter((t) => t.level === 'B1');
    expect(b1.map((t) => t.id)).toEqual(['towards-b1', 'working-life', 'society-b1']);
    for (const track of b1) {
      expect(trackLessons(track).every((l) => l.level === 'B1')).toBe(true);
    }
    expect(
      suggestedTracks('A2')
        .slice(-b1.length)
        .map((t) => t.id),
    ).toEqual(b1.map((t) => t.id));
  });
});

describe('a beginner who levels up halfway', () => {
  it('keeps the from-zero track until it is finished', () => {
    const fromZero = tracks.find((t) => t.id === 'from-zero')!;
    const halfway = new Set(fromZero.lessons.slice(0, 3));
    expect(suggestedTracks('A2', halfway)[0]?.id).toBe('from-zero');
    expect(suggestedTracks('A2', new Set(fromZero.lessons)).map((t) => t.id)).not.toContain(
      'from-zero',
    );
  });
});
