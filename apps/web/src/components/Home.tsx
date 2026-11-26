import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DAY_MS, DEFAULT_LISTENING_RATE, MIN_ANSWERS_FOR_ESTIMATE } from '@tjuvstart/engine';
import { lessons } from '../content/lessons';
import { deckId, recommendedDeck } from '../content/vocab';
import { nextInTrack, overallLevel, suggestedTracks, trackLessons } from '../content/tracks';
import type { LanguagePack } from '../content/packs';
import { DAILY_CARDS, DAILY_ITEMS } from '../data/daily';
import { db } from '../data/db';
import { dailyProgress, dueCards, getProfile } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import {
  DUE_DECK,
  aiHref,
  dailyHref,
  goalHref,
  deckHref,
  lessonsHref,
  placementHref,
  listeningHref,
  practiceHref,
  wordsHref,
} from '../routing/useHashRoute';
import { LessonCard } from './LessonList';
import { SkillLevels } from './SkillLevels';
import { StreakLine } from './StreakLine';
import { Troll } from '../troll3d/Troll';
import { useTroll } from './useTroll';

const ICONS = {
  words: (
    <>
      <rect x="7" y="3.5" width="12" height="15" rx="2" />
      <path d="M4.5 7v11.5a2 2 0 0 0 2 2H15" />
    </>
  ),
  practice: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.75" />
    </>
  ),
  listening: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3.5" y="14" width="4" height="6.5" rx="1.5" />
      <rect x="16.5" y="14" width="4" height="6.5" rx="1.5" />
    </>
  ),
  ai: <path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 20.5 12z" />,
};

/** Whole days from today until `at`, by the learner's own calendar. */
function daysUntil(at: number, now = Date.now()): number {
  const midnight = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);
  return Math.round((midnight(at) - midnight(now)) / DAY_MS);
}

/** A quick-practice row. The whole row is the link's hit area. */
function Tile({
  id,
  icon,
  title,
  body,
  href,
  action,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  href: string;
  action: string;
  children?: ReactNode;
}) {
  return (
    <section className="tile" aria-labelledby={`${id}-heading`}>
      <svg className="tile-icon" viewBox="0 0 24 24" aria-hidden="true">
        {icon}
      </svg>
      <h2 id={`${id}-heading`}>{title}</h2>
      <p className="muted small">{body}</p>
      {children}
      <a className="tile-link" href={href}>
        {action}
      </a>
    </section>
  );
}

/** Today: one clear next step, the next lesson in context, quick practice and the level estimate. */
export function Home({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t, language } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const completed = useLiveQuery(
    async () => new Set(await db.completions.toCollection().primaryKeys()),
  );
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;
  const learning = useLiveQuery(async () => new Set(await db.cards.toCollection().primaryKeys()));
  const nextDue = useLiveQuery(async () => (await db.cards.orderBy('due').first())?.due);
  const progress = useLiveQuery(() => dailyProgress());
  const hasAnswers = useLiveQuery(async () => (await db.attempts.count()) > 0);
  // Practice needs something to go on: answers in lessons, or a finished level check.
  const canPractise = hasAnswers || profile?.placedAt !== undefined;
  // Beginners skip the level check: they start on the alphabet.
  const needsPlacement =
    profile !== undefined &&
    profile.startingPoint !== 'beginner' &&
    profile.placedAt === undefined &&
    Object.values(profile.answers).every((n) => n === 0);
  const anyEstimate =
    profile !== undefined &&
    Object.values(profile.answers).some((n) => n >= MIN_ANSWERS_FOR_ESTIMATE);
  // Learners past A1 are not sent back to the beginner track.
  const level = profile
    ? overallLevel(profile.ratings, profile.answers, profile.startingPoint)
    : 'A2';
  const shownTracks = suggestedTracks(level, completed);
  // Only the track in progress is shown; the others wait on the lessons page.
  const currentTrack = completed
    ? shownTracks.find((track) => nextInTrack(track, completed))
    : undefined;
  // Tracks come first, in order; after that, the easiest lesson not done yet.
  const next = completed
    ? (shownTracks.map((track) => nextInTrack(track, completed)).find(Boolean) ??
      lessons.find(
        (lesson) => !completed.has(lesson.id) && (level === 'A1' || lesson.level !== 'A1'),
      ))
    : undefined;
  const troll = useTroll();
  const firstDeck = learning ? recommendedDeck(level, learning) : undefined;
  const trackSteps = currentTrack ? trackLessons(currentTrack) : [];
  const trackDone = trackSteps.filter((lesson) => completed?.has(lesson.id)).length;

  // One thing on the page gets the weight. Before the daily goal is met that is today's
  // session; once it is met, the next lesson takes over and the daily block steps back.
  const goalMet = progress !== undefined && progress.today >= progress.goal;
  const lessonFirst = !needsPlacement && goalMet && next !== undefined;

  const daily = progress && (
    <section className={lessonFirst ? 'daily-quiet' : 'hero'} aria-labelledby="daily-heading">
      <h2 id="daily-heading">{t('dailyTitle')}</h2>
      {!lessonFirst && (
        <p className="hero-body">{t('dailyBody', { cards: DAILY_CARDS, items: DAILY_ITEMS })}</p>
      )}
      <StreakLine progress={progress} />
      <a className={lessonFirst ? 'daily-again' : 'button'} href={dailyHref}>
        {progress.streak.doneToday ? t('dailyAgain') : t('start')}
      </a>
      <a className="hero-link small" href={goalHref}>
        {t('changeGoal')}
      </a>
    </section>
  );

  const nextLesson = completed && (
    <section
      className={lessonFirst ? 'next-lesson focus' : 'next-lesson'}
      aria-labelledby="next-heading"
    >
      <div className="section-head">
        <h2 id="next-heading">{t('nextLesson')}</h2>
        <a href={lessonsHref}>{t('seeAllLessons')}</a>
      </div>
      {currentTrack && next && (
        <div className="next-track" data-testid="next-track">
          <p className="small">
            <span lang="nb">{currentTrack.title}</span>
            <span className="muted">
              {' · '}
              {t('trackProgress', { done: trackDone, total: trackSteps.length })}
            </span>
          </p>
          <ol className="track-meter" aria-hidden="true">
            {trackSteps.map((lesson) => (
              <li key={lesson.id} className={completed.has(lesson.id) ? 'done' : undefined} />
            ))}
          </ol>
        </div>
      )}
      {next ? (
        <LessonCard lesson={next} packs={packs} focus={lessonFirst} />
      ) : (
        <p className="muted">{t('allLessonsDone')}</p>
      )}
    </section>
  );

  // Wait the few milliseconds IndexedDB takes, so cards don't appear one by one and push the
  // page down (this was most of Lighthouse's layout shift score).
  if (!profile || !completed || !progress || hasAnswers === undefined) return null;

  return (
    <>
      <header className="page-header home-header">
        <div>
          <h1>{t('hello')}</h1>
          <p className="muted">{t('todayIntro')}</p>
        </div>
        <Troll pose="coffee" outfit={troll.outfit} size={72} className="home-tusse" />
      </header>

      {needsPlacement && (
        <section className="hero" aria-labelledby="placement-heading">
          <h2 id="placement-heading">{t('placementTitle')}</h2>
          <p className="hero-body">{t('placementCard')}</p>
          <a className="button" href={placementHref}>
            {t('start')}
          </a>
        </section>
      )}
      {lessonFirst ? (
        <>
          {nextLesson}
          {daily}
        </>
      ) : (
        <>
          {!needsPlacement && daily}
          {nextLesson}
        </>
      )}

      <h2 className="section-title">{t('quickPractice')}</h2>
      <div className="tiles">
        {due > 0 ? (
          <Tile
            id="review"
            icon={ICONS.words}
            title={t('wordReview')}
            body={t('dueCount', { n: due })}
            href={deckHref(DUE_DECK)}
            action={t('start')}
          />
        ) : nextDue !== undefined ? (
          // Cards exist and none is due: say when the next review is, and offer new words.
          <Tile
            id="review"
            icon={ICONS.words}
            title={t('wordReview')}
            body={t('reviewCaughtUp', {
              when: new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(
                Math.max(0, daysUntil(nextDue)),
                'day',
              ),
            })}
            href={wordsHref}
            action={t('newWords')}
          />
        ) : (
          // No cards yet: the row is the first step, not an empty review.
          firstDeck && (
            <Tile
              id="review"
              icon={ICONS.words}
              title={t('firstWordsTitle')}
              body={
                <>
                  {t('firstWordsBody')} <span lang="nb">{firstDeck.title}</span>
                </>
              }
              href={deckHref(deckId(firstDeck))}
              action={t('start')}
            />
          )
        )}
        {canPractise && (
          <Tile
            id="practice"
            icon={ICONS.practice}
            title={t('practiceTitle')}
            body={t('practiceShort')}
            href={practiceHref}
            action={t('start')}
          />
        )}
        <Tile
          id="listening"
          icon={ICONS.listening}
          title={t('listeningTitle')}
          body={
            <span data-testid="home-listening-speed">
              {t('listeningSpeed', {
                percent: Math.round((profile?.listening?.rate ?? DEFAULT_LISTENING_RATE) * 100),
              })}
            </span>
          }
          href={listeningHref}
          action={t('start')}
        />
        <Tile
          id="ai"
          icon={ICONS.ai}
          title={t('aiTitle')}
          body={t('aiIntroShort')}
          href={aiHref}
          action={t('aiTitle')}
        />
      </div>

      <section className="home-level" aria-labelledby="level-heading">
        <h2 id="level-heading">{t('yourLevel')}</h2>
        {anyEstimate ? (
          <SkillLevels profile={profile} />
        ) : (
          <p className="muted small">{t('levelEmpty', { min: MIN_ANSWERS_FOR_ESTIMATE })}</p>
        )}
      </section>
    </>
  );
}
