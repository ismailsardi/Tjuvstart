import { getLesson } from './lessons';
import type { Lesson } from './types';

export interface Track {
  id: string;
  /** In Norwegian. */
  title: string;
  /** In English; other languages come from the packs. */
  summary: string;
  lessons: string[];
}

const files = import.meta.glob<{ tracks: Track[] }>('../../../../content/tracks.json', {
  eager: true,
  import: 'default',
});

export const tracks: readonly Track[] = Object.values(files).flatMap((file) => file.tracks);

export function trackLessons(track: Track): Lesson[] {
  return track.lessons.flatMap((id) => getLesson(id) ?? []);
}

/** Lessons that belong to a track, so the lesson list can show them there instead. */
export const trackedLessonIds: ReadonlySet<string> = new Set(tracks.flatMap((t) => t.lessons));

/** The first lesson in the track the learner has not completed yet. */
export function nextInTrack(track: Track, completed: ReadonlySet<string>): Lesson | undefined {
  return trackLessons(track).find((lesson) => !completed.has(lesson.id));
}
