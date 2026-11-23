import type { Lesson } from './types';

// Lessons are bundled at build time, so they are precached by the service worker and work offline.
const modules = import.meta.glob<Lesson>('../../../../content/lessons/**/*.json', {
  eager: true,
  import: 'default',
});

const meanDifficulty = (lesson: Lesson) =>
  lesson.items.reduce((sum, item) => sum + item.difficulty, 0) / lesson.items.length;

/** Ordered by level, then from easiest to hardest, so the list reads as a suggested path. */
export const lessons: readonly Lesson[] = Object.values(modules).sort(
  (a, b) => a.level.localeCompare(b.level) || meanDifficulty(a) - meanDifficulty(b),
);

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
