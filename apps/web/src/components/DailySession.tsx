import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { LanguagePack } from '../content/packs';
import { DAILY_CARDS, DAILY_ITEMS } from '../data/daily';
import { dailyProgress } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, homeHref } from '../routing/useHashRoute';
import { DeckSession } from './DeckSession';
import { Practice } from './Practice';
import { SessionResult } from './SessionResult';
import { StreakLine } from './StreakLine';
import { useProgressSnapshot } from './useProgressSnapshot';

type Stage = 'cards' | 'practice' | 'done';

/**
 * About ten minutes a day: the word cards that are due, then exercises picked from weak
 * skills and recurring mistakes. The end screen reveals the score, how each skill moved, any
 * can-do statement the session completed, and the streak.
 */
export function DailySession({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>('cards');
  const [result, setResult] = useState({ score: 0, bestRun: 0 });
  const progress = useLiveQuery(() => dailyProgress());
  const { before, after } = useProgressSnapshot(stage === 'done');

  const toPractice = useCallback(() => setStage('practice'), []);
  const toDone = useCallback((score: number, bestRun = 0) => {
    setResult({ score, bestRun });
    setStage('done');
  }, []);

  if (!before) return null;

  if (stage === 'done') {
    return (
      <SessionResult
        heading={t('dailyDone')}
        score={result.score}
        total={DAILY_ITEMS}
        bestRun={result.bestRun}
        before={before}
        after={after}
        packs={packs}
        footer={progress && <StreakLine progress={progress} />}
      >
        <a className="button" href={homeHref}>
          {t('backHome')}
        </a>
      </SessionResult>
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
