import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_LISTENING_RATE, MIN_ANSWERS_FOR_ESTIMATE } from '@tjuvstart/engine';
import { lessons } from '../content/lessons';
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
import { ReminderOffer } from './ReminderSettings';
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
  streak: (
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" />
  ),
};

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
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const completed = useLiveQuery(
    async () => new Set(await db.completions.toCollection().primaryKeys()),
  );
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;
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
  const streakDays = progress?.streak.days ?? 0;
  const troll = useTroll();
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

  // The first day the goal is met is when a reminder is easiest to see the point of.
  const reminderOffer = goalMet && <ReminderOffer />;

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
          <div className="home-greeting">
            <h1>{t('hello')}</h1>
            {streakDays > 0 && (
              <span className="streak-badge" title={t('streakBadge', { n: streakDays })}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {ICONS.streak}
                </svg>
                <span aria-hidden="true">{streakDays}</span>
                <span className="visually-hidden">{t('streakBadge', { n: streakDays })}</span>
              </span>
            )}
          </div>
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
          {reminderOffer}
        </>
      ) : (
        <>
          {!needsPlacement && daily}
          {!needsPlacement && reminderOffer}
          {nextLesson}
        </>
      )}

      <h2 className="section-title">{t('quickPractice')}</h2>
      <div className="tiles">
        <Tile
          id="review"
          icon={ICONS.words}
          title={t('wordReview')}
          body={due > 0 ? t('dueCount', { n: due }) : t('nothingDue')}
          href={due > 0 ? deckHref(DUE_DECK) : wordsHref}
          action={due > 0 ? t('start') : t('navWords')}
        />
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
