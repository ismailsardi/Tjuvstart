import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { LanguagePack } from '../content/packs';
import { decks, type Card } from '../content/vocab';
import { db } from '../data/db';
import { addCards, dueCards } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { homeHref, reviewHref } from '../routing/useHashRoute';
import { WordCard } from './WordCard';

/** The Words menu: every deck by level, with the cards the learner is studying marked. */
export function Words({ packs = [] }: { packs?: readonly LanguagePack[] }) {
  const { t } = useI18n();
  const learning = useLiveQuery(async () => new Set(await db.cards.toCollection().primaryKeys()));
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;

  return (
    <>
      <a href={homeHref} className="muted">
        {t('home')}
      </a>
      <h1>{t('wordCards')}</h1>
      <p className="muted">{t('wordCardsIntro')}</p>

      <div className="review-banner">
        <span>{due > 0 ? t('dueCount', { n: due }) : t('nothingDue')}</span>
        {due > 0 && (
          <a className="button" href={reviewHref}>
            {t('reviewNow')}
          </a>
        )}
      </div>

      {decks.map((deck) => (
        <details key={`${deck.level}-${deck.topic}`} className="deck">
          <summary>
            <span className="badge">{deck.level}</span> <strong lang="nb">{deck.title}</strong>{' '}
            <span className="muted">{t('cardCount', { n: deck.cards.length })}</span>
          </summary>
          <ul className="card-grid">
            {deck.cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                packs={packs}
                learning={learning?.has(card.id) ?? false}
              />
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

function CardTile({
  card,
  packs,
  learning,
}: {
  card: Card;
  packs: readonly LanguagePack[];
  learning: boolean;
}) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);
  return (
    <li data-testid={`card-${card.id}`}>
      <button
        type="button"
        className="card-face"
        aria-expanded={revealed}
        onClick={() => setRevealed(!revealed)}
      >
        <WordCard card={card} packs={packs} revealed={revealed} />
      </button>
      {learning ? (
        <span className="muted small">{t('learning')}</span>
      ) : (
        <button type="button" className="secondary small" onClick={() => void addCards([card.id])}>
          {t('learn')}
        </button>
      )}
    </li>
  );
}
