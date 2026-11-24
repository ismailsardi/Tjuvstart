import { useEffect, useState } from 'react';
import {
  PLACEMENT_DEFAULTS,
  maxPlacementQuestions,
  nextPlacementItem,
  ratingToLevel,
  recordPlacementAnswer,
  skillPlaced,
  startPlacement,
  type PlacementState,
} from '@tjuvstart/engine';
import { checkAnswer, correctAnswer, guessChance, type Response } from '../content/answers';
import { allItems, readingTextFor } from '../content/lessons';
import { SKILL_NAMES, type Skill } from '../content/types';
import { savePlacement } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref } from '../routing/useHashRoute';
import { ItemView } from './ItemView';
import { SessionBar } from './SessionBar';
import { Tusse } from './Tusse';
import { useTusseGear } from './useTusseGear';

/** Skills that have items today. Speaking joins once speaking exercises exist. */
const PLACED_SKILLS = [...new Set(allItems.map((item) => item.skill))] as Skill[];

/**
 * The placement check: adaptive questions, then a starting level per skill. Each skill stops
 * as soon as its estimate is precise enough, so most learners finish well before the maximum.
 */
export function Placement() {
  const { t } = useI18n();
  const [state, setState] = useState<PlacementState | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const item = state && feedback === null ? nextPlacementItem(state, allItems) : undefined;
  // The most questions still possible: skills already placed count what they took.
  const total = state
    ? PLACED_SKILLS.reduce(
        (sum, skill) =>
          sum +
          (skillPlaced(state, skill)
            ? (state.answers[skill]?.length ?? 0)
            : PLACEMENT_DEFAULTS.max),
        0,
      )
    : maxPlacementQuestions(PLACED_SKILLS);
  const finished = state !== null && feedback === null && !item;
  const gear = useTusseGear();

  useEffect(() => {
    if (finished && state) void savePlacement(state.ratings);
  }, [finished, state]);

  if (!state) {
    return (
      <article aria-labelledby="placement-heading">
        <a href={homeHref} className="back-link">
          {t('home')}
        </a>
        <h1 id="placement-heading">{t('placementTitle')}</h1>
        <p>{t('placementIntro', { n: total })}</p>
        <button type="button" onClick={() => setState(startPlacement(PLACED_SKILLS))}>
          {t('start')}
        </button>
      </article>
    );
  }

  if (finished) {
    return (
      <section aria-labelledby="placement-done" className="panel done-screen">
        <Tusse pose="cheer" gear={gear} size={110} className="done-tusse" />
        <h1 id="placement-done">{t('placementDone')}</h1>
        <ul className="skills">
          {PLACED_SKILLS.map((skill) => (
            <li key={skill} data-testid={`placed-${skill}`}>
              <span lang="nb">{SKILL_NAMES[skill]}</span>
              <span className="level">{ratingToLevel(state.ratings[skill] ?? 1000)}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">{t('placementNote')}</p>
        <a className="button" href={homeHref}>
          {t('backHome')}
        </a>
      </section>
    );
  }

  const current = item ?? allItems.find((i) => i.id === state.seen.at(-1));
  if (!current) return null;
  const text = readingTextFor(current);

  function submit(response: Response) {
    if (!current || feedback !== null || !state) return;
    const { correct } = checkAnswer(current, response);
    setFeedback(correct);
    setState(recordPlacementAnswer(state, current, correct, guessChance(current)));
  }

  return (
    <article className="session" aria-labelledby="placement-heading">
      <SessionBar
        closeHref={homeHref}
        done={state.seen.length - (feedback === null ? 0 : 1)}
        total={total}
        label={t('question', { n: state.seen.length + (feedback === null ? 1 : 0), total })}
      />
      <h1 id="placement-heading" className="eyebrow">
        {t('placementTitle')}
      </h1>
      {text && (
        <p className="reading-text" lang="nb">
          {text}
        </p>
      )}
      <h2 className="prompt" lang="nb">
        {current.prompt}
      </h2>
      <ItemView key={current.id} item={current} disabled={feedback !== null} onSubmit={submit} />
      {feedback !== null && (
        <div className={feedback ? 'feedback good' : 'feedback bad'} role="status">
          <p>
            <span>
              {feedback ? (
                t('correct')
              ) : (
                <>
                  {t('notQuite')} <strong lang="nb">{correctAnswer(current)}</strong>.
                </>
              )}
            </span>
          </p>
          <Tusse
            pose={feedback ? 'thumbs' : 'shrug'}
            gear={gear}
            size={60}
            className="feedback-tusse"
          />
          <button type="button" onClick={() => setFeedback(null)} autoFocus>
            {t('continue')}
          </button>
        </div>
      )}
    </article>
  );
}
