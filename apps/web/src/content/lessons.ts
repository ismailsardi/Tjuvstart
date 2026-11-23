import type { Item, Lesson } from './types';

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

/** Every item across all lessons, for placement and practice sessions. */
export const allItems: readonly Item[] = lessons.flatMap((lesson) => lesson.items);

const lessonOfItem = new Map(
  lessons.flatMap((lesson) => lesson.items.map((item) => [item.id, lesson.id] as const)),
);
const itemsById = new Map(allItems.map((item) => [item.id, item]));

export function lessonIdForItem(itemId: string): string | undefined {
  return lessonOfItem.get(itemId);
}

export function getItem(itemId: string): Item | undefined {
  return itemsById.get(itemId);
}

/** The text a reading item asks about, taken from the lesson it belongs to. */
export function readingTextFor(item: Item): string | undefined {
  if (item.skill !== 'reading') return undefined;
  const lessonId = lessonOfItem.get(item.id);
  return lessonId ? getLesson(lessonId)?.text : undefined;
}
