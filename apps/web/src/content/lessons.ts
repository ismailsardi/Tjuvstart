import type { Lesson } from './types';

// Lessons are bundled at build time, so they are precached by the service worker and work offline.
const modules = import.meta.glob<Lesson>('../../../../content/lessons/**/*.json', {
  eager: true,
  import: 'default',
});

export const lessons: readonly Lesson[] = Object.values(modules).sort(
  (a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title, 'nb'),
);

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
