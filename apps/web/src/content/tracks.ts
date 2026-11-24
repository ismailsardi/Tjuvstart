import { ratingToLevel, type Level } from '@tjuvstart/engine';
import { getLesson } from './lessons';
import type { Lesson, Skill } from './types';

export interface Track {
  id: string;
  /** The level the track is written for. */
  level: Level;
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

/**
 * The learner's overall level for choosing what to suggest: the mean rating over the skills
 * they have answered in. With no answers yet, A2, the level most of the audience starts at.
 */
export function overallLevel(
  ratings: Readonly<Record<Skill, number>>,
  answers: Readonly<Record<Skill, number>>,
): Level {
  const answered = (Object.keys(ratings) as Skill[]).filter((skill) => answers[skill] > 0);
  if (answered.length === 0) return 'A2';
  const mean = answered.reduce((sum, skill) => sum + ratings[skill], 0) / answered.length;
  return ratingToLevel(mean);
}

/** Beginner tracks are only suggested to learners who are still at A1. */
export function suggestedTracks(level: Level): readonly Track[] {
  return level === 'A1' ? tracks : tracks.filter((track) => track.level !== 'A1');
}
