import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Grade } from '@tjuvstart/engine';
import type { LanguagePack } from '../content/packs';
import { getCard } from '../content/vocab';
import { dueCards, reviewCard } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { wordsHref } from '../routing/useHashRoute';
import { WordCard } from './WordCard';

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

/** Daily review: one due card at a time, graded by the learner. */
export function Review({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  // Re-runs after every review, so a card graded "again" is back once its ten minutes are up.
  const due = useLiveQuery(() => dueCards(Date.now()));
  const [revealed, setRevealed] = useState(false);

  if (!due) return null;

  const next = due.map((progress) => getCard(progress.cardId)).find((card) => card !== undefined);

  return (
    <article aria-labelledby="review-heading">
      <a href={wordsHref} className="muted">
        ← {t('wordCards')}
      </a>
      <h1 id="review-heading">{t('reviewNow')}</h1>
      {!next ? (
        <p role="status">{t('reviewDone')}</p>
      ) : (
        <>
          <p className="muted">{t('reviewLeft', { n: due.length })}</p>
          <WordCard card={next} packs={packs} revealed={revealed} />
          {revealed ? (
            <div className="grades" role="group" aria-label={t('showAnswer')}>
              {GRADES.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className={`grade ${grade}`}
                  onClick={async () => {
                    await reviewCard(next.id, grade);
                    setRevealed(false);
                  }}
                >
                  {t(grade)}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setRevealed(true)} autoFocus>
              {t('showAnswer')}
            </button>
          )}
        </>
      )}
    </article>
  );
}
