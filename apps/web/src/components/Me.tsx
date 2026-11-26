import { useLiveQuery } from 'dexie-react-hooks';
import { MIN_ANSWERS_FOR_ESTIMATE } from '@tjuvstart/engine';
import { db } from '../data/db';
import type { LanguagePack } from '../content/packs';
import { trackedDescriptors } from '../content/descriptors';
import {
  canDoProgress,
  dailyProgress,
  getProfile,
  mistakeMemory,
  shadowedSentences,
  wordCounts,
} from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import {
  aiHref,
  languagesHref,
  lessonsHref,
  placementHref,
  wardrobeHref,
  wordsHref,
} from '../routing/useHashRoute';
import { AiSettingsForm } from './AiSettingsForm';
import { CanDoList } from './CanDoList';
import { GoalPicker } from './GoalPicker';
import { MistakeList } from './MistakeList';
import { SkillLevels } from './SkillLevels';
import { StreakLine } from './StreakLine';
import { SyncPanel } from './SyncPanel';
import { Tusse } from './Tusse';
import { useTroll } from './useTroll';

export function Me({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const profile = useLiveQuery(() => getProfile());
  const memory = useLiveQuery(() => mistakeMemory());
  const shadowed = useLiveQuery(() => shadowedSentences()) ?? 0;
  const progress = useLiveQuery(() => dailyProgress());
  const canDo = useLiveQuery(() => canDoProgress());
  const words = useLiveQuery(() => wordCounts());
  const troll = useTroll();
  const hasAnswers = useLiveQuery(async () => (await db.attempts.count()) > 0);
  const anyEstimate =
    profile !== undefined &&
    Object.values(profile.answers).some((n) => n >= MIN_ANSWERS_FOR_ESTIMATE);
  const canDoReached = canDo ? [...canDo.values()].filter((s) => s === 'can-do').length : 0;
  // Only statements that some exercise checks, grouped by level.
  const levels = [...new Set(trackedDescriptors.map((d) => d.level))];
  const languageNames =
    packs.length > 0 ? packs.map((pack) => pack.nativeName).join(', ') : t('otherLanguage');
  return (
    <>
      <h1>{t('profile')}</h1>
      {hasAnswers || shadowed > 0 || (words?.studying ?? 0) > 0 ? (
        <ul className="stats" data-testid="stats">
          <li>
            <span className="stat-value">{words?.known ?? 0}</span>
            <span className="stat-label">{t('statWordsKnown')}</span>
          </li>
          <li>
            <span className="stat-value">{canDoReached}</span>
            <span className="stat-label">{t('statCanDo')}</span>
          </li>
          <li data-testid="shadowed">
            <span className="stat-value">{shadowed}</span>
            <span className="stat-label">{t('statSpoken')}</span>
          </li>
        </ul>
      ) : (
        // Three zeros say nothing to a new learner; say what will fill them instead.
        hasAnswers === false && (
          <p className="muted stats-empty" data-testid="stats">
            {t('statsEmpty')} <a href={lessonsHref}>{t('statsEmptyLink')}</a>
          </p>
        )
      )}
      <section className="panel" aria-labelledby="me-level">
        <h2 id="me-level">{t('yourLevel')}</h2>
        {anyEstimate ? (
          <SkillLevels profile={profile} />
        ) : (
          <p className="muted small">{t('levelEmpty', { min: MIN_ANSWERS_FOR_ESTIMATE })}</p>
        )}
        <a href={placementHref}>
          {profile?.placedAt !== undefined ? t('redoPlacement') : t('takePlacement')}
        </a>
      </section>
      <section className="panel me-troll" aria-labelledby="me-troll">
        <Tusse pose="rest" outfit={troll.outfit} size={64} />
        <div>
          <h2 id="me-troll">{t('trollTitle')}</h2>
          <p data-testid="troll-name">
            {troll.name} · <a href={wardrobeHref}>{t('trollEdit')}</a>
          </p>
        </div>
      </section>
      {progress && (
        <section className="panel" aria-label={t('dailyGoalTitle')}>
          <StreakLine progress={progress} />
          <p className="muted small">{t('streakRule')}</p>
          <GoalPicker value={progress.goalSize} />
        </section>
      )}
      {canDo && (
        <section className="panel" aria-labelledby="me-can-do">
          <h2 id="me-can-do">{t('canDoTitle')}</h2>
          <p className="muted small">{t('canDoIntro')}</p>
          {levels.map((level) => {
            const list = trackedDescriptors.filter((d) => d.level === level);
            const done = list.filter((d) => canDo.get(d.id) === 'can-do').length;
            return (
              <details key={level} open={level === levels[0]}>
                <summary>
                  <span className="badge">{level}</span>{' '}
                  {t('canDoCount', { n: done, total: list.length })}
                </summary>
                <CanDoList descriptors={list} status={canDo} packs={packs} />
              </details>
            );
          })}
        </section>
      )}
      {hasAnswers && (
        <section className="panel" aria-labelledby="me-mistakes">
          <h2 id="me-mistakes">{t('recurringMistakes')}</h2>
          <MistakeList focus={memory?.recurring ?? []} />
        </section>
      )}
      <section className="panel" aria-label={t('languages', { languages: '' })}>
        <p data-testid="languages">
          {t('languages', { languages: languageNames })} · <a href={languagesHref}>{t('change')}</a>
        </p>
        <p data-testid="job-field">
          {t('myJob')}: {profile?.jobField ? t(`field_${profile.jobField}`) : t('jobNotChosen')} ·{' '}
          <a href={wordsHref}>{profile?.jobField ? t('change') : t('choose')}</a>
        </p>
      </section>
      <SyncPanel />
      <section className="panel" aria-labelledby="me-ai">
        <h2 id="me-ai">{t('aiKeyTitle')}</h2>
        <AiSettingsForm />
        <p>
          <a href={aiHref}>{t('aiTitle')}</a>
        </p>
      </section>
    </>
  );
}
