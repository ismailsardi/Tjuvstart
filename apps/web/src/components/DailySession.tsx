import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { CanDoStatus } from '@tjuvstart/engine';
import { trackedDescriptors } from '../content/descriptors';
import type { LanguagePack } from '../content/packs';
import { DAILY_CARDS, DAILY_ITEMS } from '../data/daily';
import { canDoProgress, dailyProgress } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, homeHref } from '../routing/useHashRoute';
import { CanDoList } from './CanDoList';
import { DeckSession } from './DeckSession';
import { Practice } from './Practice';
import { StreakLine } from './StreakLine';

type Stage = 'cards' | 'practice' | 'done';

/**
 * About ten minutes a day: the word cards that are due, then exercises picked from weak
 * skills and recurring mistakes. The end screen shows the streak and any can-do statement
 * the session completed.
 */
export function DailySession({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>('cards');
  const [score, setScore] = useState(0);
  const [before, setBefore] = useState<Map<string, CanDoStatus> | null>(null);
  const [after, setAfter] = useState<Map<string, CanDoStatus> | null>(null);
  const progress = useLiveQuery(() => dailyProgress());

  useEffect(() => {
    void canDoProgress().then(setBefore);
  }, []);
  useEffect(() => {
    if (stage === 'done') void canDoProgress().then(setAfter);
  }, [stage]);

  const toPractice = useCallback(() => setStage('practice'), []);
  const toDone = useCallback((n: number) => {
    setScore(n);
    setStage('done');
  }, []);

  if (!before) return null;

  if (stage === 'done') {
    const reached = trackedDescriptors.filter(
      (d) => after?.get(d.id) === 'can-do' && before.get(d.id) !== 'can-do',
    );
    return (
      <section className="daily-done" aria-labelledby="daily-done-heading">
        <h1 id="daily-done-heading">{t('dailyDone')}</h1>
        <p>{t('dailyDoneBody', { score, total: DAILY_ITEMS })}</p>
        {progress && <StreakLine progress={progress} />}
        {reached.length > 0 && after && (
          <section className="panel" aria-labelledby="new-can-do">
            <h2 id="new-can-do">{t('canDoNew')}</h2>
            <CanDoList descriptors={reached} status={after} packs={packs} />
          </section>
        )}
        <a className="button" href={homeHref}>
          {t('backHome')}
        </a>
      </section>
    );
  }

  return (
    <>
      <ol className="daily-steps" aria-label={t('dailyTitle')}>
        <li aria-current={stage === 'cards' ? 'step' : undefined}>{t('dailyStepCards')}</li>
        <li aria-current={stage === 'practice' ? 'step' : undefined}>{t('dailyStepPractice')}</li>
      </ol>
      {stage === 'cards' ? (
        <DeckSession deckId={DUE_DECK} packs={packs} limit={DAILY_CARDS} onFinish={toPractice} />
      ) : (
        <Practice packs={packs} size={DAILY_ITEMS} onFinish={toDone} />
      )}
    </>
  );
}
