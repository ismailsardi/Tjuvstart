import { useLiveQuery } from 'dexie-react-hooks';
import { lessons } from '../content/lessons';
import { trackedLessonIds, tracks } from '../content/tracks';
import { firstNote, type LanguagePack } from '../content/packs';
import type { Lesson } from '../content/types';
import { db } from '../data/db';
import { useI18n } from '../i18n/useI18n';
import { lessonHref } from '../routing/useHashRoute';
import { TrackPath } from './TrackPath';

export function LessonCard({ lesson, packs }: { lesson: Lesson; packs: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const done = useLiveQuery(() => db.completions.get(lesson.id), [lesson.id]);
  const summary = firstNote(packs, (pack) => pack.lessonSummaries?.[lesson.id]);
  return (
    <a className={done ? 'lesson-card completed' : 'lesson-card'} href={lessonHref(lesson.id)}>
      <span className="lesson-meta">
        <span className="badge">{lesson.level}</span>
        <span className="muted small">{t('lessonItems', { n: lesson.items.length })}</span>
      </span>
      <strong lang="nb">{lesson.title}</strong>
      {summary ? (
        <span className="muted" lang={summary.pack.language} dir={summary.pack.direction}>
          {summary.text}
        </span>
      ) : (
        <span className="muted">{lesson.summary}</span>
      )}
      {done && (
        <span className="done" data-testid={`completed-${lesson.id}`}>
          ✓ {t('completed', { score: done.bestScore, total: done.total })}
        </span>
      )}
    </a>
  );
}

/** Guided tracks first, then the other lessons grouped by level, with completed ones marked. */
export function LessonList({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const others = lessons.filter((lesson) => !trackedLessonIds.has(lesson.id));
  const levels = [...new Set(others.map((lesson) => lesson.level))];
  return (
    <>
      <h1>{t('lessons')}</h1>
      {tracks.map((track) => (
        <TrackPath key={track.id} track={track} packs={packs} />
      ))}
      {others.length > 0 && <h2>{t('moreLessons')}</h2>}
      {levels.map((level) => (
        <section key={level} aria-label={level}>
          <h3>{level}</h3>
          <ul className="lessons">
            {others
              .filter((lesson) => lesson.level === level)
              .map((lesson) => (
                <li key={lesson.id}>
                  <LessonCard lesson={lesson} packs={packs} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
