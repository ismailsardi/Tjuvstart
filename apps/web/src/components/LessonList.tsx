import { useLiveQuery } from 'dexie-react-hooks';
import { lessons } from '../content/lessons';
import { firstNote, type LanguagePack } from '../content/packs';
import type { Lesson } from '../content/types';
import { db } from '../data/db';
import { useI18n } from '../i18n/useI18n';
import { lessonHref } from '../routing/useHashRoute';

export function LessonCard({ lesson, packs }: { lesson: Lesson; packs: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const done = useLiveQuery(() => db.completions.get(lesson.id), [lesson.id]);
  const summary = firstNote(packs, (pack) => pack.lessonSummaries?.[lesson.id]);
  return (
    <a className={done ? 'lesson-card completed' : 'lesson-card'} href={lessonHref(lesson.id)}>
      <span className="badge">{lesson.level}</span>
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

/** Every lesson, grouped by level, with completed ones marked. */
export function LessonList({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const levels = [...new Set(lessons.map((lesson) => lesson.level))];
  return (
    <>
      <h1>{t('lessons')}</h1>
      {levels.map((level) => (
        <section key={level} aria-label={level}>
          <h2>{level}</h2>
          <ul className="lessons">
            {lessons
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
