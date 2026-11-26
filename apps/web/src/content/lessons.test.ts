import { describe, expect, it } from 'vitest';
import { checkAnswer } from './answers';
import { allItems, getLesson, lessons } from './lessons';

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

  it('gives every gap-fill exactly one blank', () => {
    const gaps = allItems.filter((item) => item.type === 'gap-fill');
    expect(gaps.filter((item) => item.prompt.split(/_{2,}/).length !== 2)).toEqual([]);
  });

  it('accepts other correct ways to fill a gap', () => {
    const answer = (id: string, value: string) => {
      const item = allItems.find((i) => i.id === id);
      if (!item) throw new Error(`Missing item ${id}`);
      return checkAnswer(item, { kind: 'text', value }).correct;
    };
    // «Jeg ___ Sara.»: both «heter» and «er» are good Norwegian.
    expect(answer('a1-hei-04', 'er')).toBe(true);
    expect(answer('a1-hei-04', 'Jeg er Sara.')).toBe(true);
    expect(answer('a2-fdw-08', 'er')).toBe(true);
    expect(answer('a1-hei-04', 'bor')).toBe(false);
  });
});
