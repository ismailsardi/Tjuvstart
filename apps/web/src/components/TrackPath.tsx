import { useLiveQuery } from 'dexie-react-hooks';
import { firstNote, type LanguagePack } from '../content/packs';
import { nextInTrack, trackLessons, type Track } from '../content/tracks';
import { db } from '../data/db';
import { useI18n } from '../i18n/useI18n';
import { lessonHref } from '../routing/useHashRoute';

/** A track as numbered steps, with completed lessons ticked and the next one highlighted. */
export function TrackPath({ track, packs }: { track: Track; packs: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const completed = useLiveQuery(
    async () => new Set(await db.completions.toCollection().primaryKeys()),
  );
  const lessons = trackLessons(track);
  const done = lessons.filter((lesson) => completed?.has(lesson.id)).length;
  const next = completed ? nextInTrack(track, completed) : undefined;
  const summary = firstNote(packs, (pack) => pack.trackSummaries?.[track.id]);
  const headingId = `track-${track.id}`;

  return (
    <section className="panel track" aria-labelledby={headingId}>
      <h2 id={headingId} lang="nb">
        {track.title}
      </h2>
      {summary ? (
        <p className="muted" lang={summary.pack.language} dir={summary.pack.direction}>
          {summary.text}
        </p>
      ) : (
        <p className="muted">{track.summary}</p>
      )}
      <p className="small" data-testid={`track-progress-${track.id}`}>
        {completed && !next ? t('trackDone') : t('trackProgress', { done, total: lessons.length })}
      </p>
      <progress value={done} max={lessons.length} aria-hidden="true" />
      <ol className="track-steps">
        {lessons.map((lesson, index) => {
          const isDone = completed?.has(lesson.id) ?? false;
          const isNext = lesson.id === next?.id;
          return (
            <li key={lesson.id} className={isDone ? 'done' : isNext ? 'next' : undefined}>
              <a href={lessonHref(lesson.id)} aria-current={isNext ? 'step' : undefined}>
                <span className="step-dot" aria-hidden="true">
                  {isDone ? '✓' : index + 1}
                </span>
                <span className="visually-hidden">{t('trackStep', { n: index + 1 })}: </span>
                <span lang="nb">{lesson.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
