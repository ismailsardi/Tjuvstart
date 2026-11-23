import { useEffect, useState } from 'react';
import {
  nextPlacementItem,
  ratingToLevel,
  recordPlacementAnswer,
  startPlacement,
  type PlacementState,
} from '@tjuvstart/engine';
import { correctAnswer, isCorrect, type Response } from '../content/answers';
import { allItems, readingTextFor } from '../content/lessons';
import { SKILL_NAMES, type Skill } from '../content/types';
import { savePlacement } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref } from '../routing/useHashRoute';
import { ItemView } from './ItemView';

/** Skills that have items today. Listening and speaking join once audio exercises exist. */
const PLACED_SKILLS = [...new Set(allItems.map((item) => item.skill))] as Skill[];
export const ITEMS_PER_SKILL = 6;

/** The five-minute placement check: adaptive questions, then a starting level per skill. */
export function Placement() {
  const { t } = useI18n();
  const [state, setState] = useState<PlacementState | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const total = PLACED_SKILLS.length * ITEMS_PER_SKILL;
  const item =
    state && feedback === null ? nextPlacementItem(state, allItems, ITEMS_PER_SKILL) : undefined;
  const finished = state !== null && feedback === null && !item;

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
      <section aria-labelledby="placement-done" className="panel">
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
    const correct = isCorrect(current, response);
    setFeedback(correct);
    setState(recordPlacementAnswer(state, current, correct));
  }

  return (
    <article aria-labelledby="placement-heading">
      <h1 id="placement-heading">{t('placementTitle')}</h1>
      <progress
        value={state.seen.length - (feedback === null ? 0 : 1)}
        max={total}
        aria-label={t('question', { n: state.seen.length + (feedback === null ? 1 : 0), total })}
      />
      <p className="muted small">
        {t('question', { n: state.seen.length + (feedback === null ? 1 : 0), total })}
      </p>
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
            {feedback ? (
              t('correct')
            ) : (
              <>
                {t('notQuite')} <strong lang="nb">{correctAnswer(current)}</strong>.
              </>
            )}
          </p>
          <button type="button" onClick={() => setFeedback(null)} autoFocus>
            {t('continue')}
          </button>
        </div>
      )}
    </article>
  );
}
