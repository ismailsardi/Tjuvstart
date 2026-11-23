import { useLiveQuery } from 'dexie-react-hooks';
import { decks, deckId } from '../content/vocab';
import { db } from '../data/db';
import { dueCards } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, deckHref } from '../routing/useHashRoute';

/** The Words tab: today's review, then every deck with how much of it is being learned. */
export function Words() {
  const { t } = useI18n();
  const learning = useLiveQuery(async () => new Set(await db.cards.toCollection().primaryKeys()));
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;

  return (
    <>
      <header className="page-header">
        <h1>{t('wordCards')}</h1>
        <p className="muted">{t('wordCardsIntro')}</p>
      </header>

      <a className={due > 0 ? 'deck-tile due' : 'deck-tile due empty'} href={deckHref(DUE_DECK)}>
        <strong>{t('dueDeck')}</strong>
        <span>{due > 0 ? t('dueCount', { n: due }) : t('dueDeckEmpty')}</span>
      </a>

      <ul className="deck-list">
        {decks.map((deck) => {
          const studied = deck.cards.filter((card) => learning?.has(card.id)).length;
          return (
            <li key={deckId(deck)}>
              <a
                className="deck-tile"
                href={deckHref(deckId(deck))}
                data-testid={`deck-${deckId(deck)}`}
              >
                <span className="badge">{deck.level}</span>
                <strong lang="nb">{deck.title}</strong>
                <span className="muted small">
                  {t('learningOf', { n: studied, total: deck.cards.length })}
                </span>
                <progress value={studied} max={deck.cards.length} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
