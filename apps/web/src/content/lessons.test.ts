import { describe, expect, it } from 'vitest';
import { getLesson, lessons } from './lessons';

describe('bundled lessons', () => {
  it('includes the A2 sample lesson', () => {
    const lesson = getLesson('a2-first-day-at-work');
    expect(lesson?.title).toBe('Første dag på jobben');
    expect(lesson?.items.length).toBeGreaterThanOrEqual(15);
  });

  it('lists lessons by level, easiest first', () => {
    expect(lessons[0]?.id).toBe('a2-first-day-at-work');
    expect(lessons.length).toBeGreaterThanOrEqual(4);
  });

  it('has unique item ids', () => {
    const ids = lessons.flatMap((lesson) => lesson.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
