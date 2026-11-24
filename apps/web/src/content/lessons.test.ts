import { describe, expect, it } from 'vitest';
import { getLesson, lessons } from './lessons';

describe('bundled lessons', () => {
  it('includes the A2 sample lesson', () => {
    const lesson = getLesson('a2-first-day-at-work');
    expect(lesson?.title).toBe('Første dag på jobben');
    expect(lesson?.items.length).toBeGreaterThanOrEqual(15);
  });

  it('lists lessons by level, easiest first', () => {
    expect(lessons[0]?.level).toBe('A1');
    expect(lessons.findIndex((l) => l.level === 'A2')).toBeGreaterThan(0);
    expect(lessons.findLastIndex((l) => l.level === 'A1')).toBeLessThan(
      lessons.findIndex((l) => l.level === 'A2'),
    );
  });

  it('includes the beginner track from zero', () => {
    expect(getLesson('a1-alphabet')?.title).toBe('Alfabetet og æ, ø, å');
    expect(lessons.filter((l) => l.level === 'A1').length).toBeGreaterThanOrEqual(8);
  });

  it('marks every lesson with its native review status', () => {
    for (const lesson of lessons) expect(['pending', 'approved']).toContain(lesson.review);
  });

  it('has unique item ids', () => {
    const ids = lessons.flatMap((lesson) => lesson.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
