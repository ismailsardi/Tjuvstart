import { useLiveQuery } from 'dexie-react-hooks';
import { lessons } from '../content/lessons';
import type { LanguagePack } from '../content/packs';
import { db } from '../data/db';
import { dueCards, getProfile, mistakeMemory } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import {
  DUE_DECK,
  deckHref,
  lessonsHref,
  placementHref,
  practiceHref,
  wordsHref,
} from '../routing/useHashRoute';
import { MistakeList } from './MistakeList';
import { LessonCard } from './LessonList';
import { SkillLevels } from './SkillLevels';

/** Today: the word review, the next lesson and the level estimate. */
export function Home({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const completed = useLiveQuery(
    async () => new Set(await db.completions.toCollection().primaryKeys()),
  );
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;
  const memory = useLiveQuery(() => mistakeMemory());
  const hasAnswers = useLiveQuery(async () => (await db.attempts.count()) > 0);
  // Practice needs something to go on: answers in lessons, or a finished level check.
  const canPractise = hasAnswers || profile?.placedAt !== undefined;
  const needsPlacement =
    profile !== undefined &&
    profile.placedAt === undefined &&
    Object.values(profile.answers).every((n) => n === 0);
  const next = completed ? lessons.find((lesson) => !completed.has(lesson.id)) : undefined;

  return (
    <>
      <header className="page-header">
        <h1>{t('hello')}</h1>
        <p className="muted">{t('todayIntro')}</p>
      </header>

      {needsPlacement && (
        <section className="panel placement-panel" aria-labelledby="placement-heading">
          <h2 id="placement-heading">{t('placementTitle')}</h2>
          <p className="muted">{t('placementCard')}</p>
          <a className="button" href={placementHref}>
            {t('start')}
          </a>
        </section>
      )}

      <section className="panel review-panel" aria-labelledby="review-heading">
        <div>
          <h2 id="review-heading">{t('wordReview')}</h2>
          <p className="muted">{due > 0 ? t('dueCount', { n: due }) : t('nothingDue')}</p>
        </div>
        <a className="button" href={due > 0 ? deckHref(DUE_DECK) : wordsHref}>
          {due > 0 ? t('start') : t('navWords')}
        </a>
      </section>

      <section aria-labelledby="next-heading">
        <div className="section-head">
          <h2 id="next-heading">{t('nextLesson')}</h2>
          <a href={lessonsHref}>{t('seeAllLessons')}</a>
        </div>
        {next ? (
          <LessonCard lesson={next} packs={packs} />
        ) : (
          completed && <p className="muted">{t('allLessonsDone')}</p>
        )}
      </section>

      {canPractise && (
        <section className="panel" aria-labelledby="practice-heading">
          <h2 id="practice-heading">{t('practiceTitle')}</h2>
          <p className="muted">{t('practiceCard')}</p>
          {memory && memory.recurring.length > 0 && <MistakeList focus={memory.recurring} />}
          <a className="button" href={practiceHref}>
            {t('start')}
          </a>
        </section>
      )}

      <section className="panel" aria-labelledby="level-heading">
        <h2 id="level-heading">{t('yourLevel')}</h2>
        <SkillLevels profile={profile} />
      </section>
    </>
  );
}
