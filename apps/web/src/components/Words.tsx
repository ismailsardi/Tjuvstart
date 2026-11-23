import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { JOB_FIELDS, decks, deckId, jobDeck, type Deck } from '../content/vocab';
import { db } from '../data/db';
import { dueCards, getProfile, saveJobField } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, deckHref } from '../routing/useHashRoute';

/**
 * The Words tab: today's review, the deck for the learner's line of work, then every general
 * deck with how much of it is being learned.
 */
export function Words() {
  const { t } = useI18n();
  const learning = useLiveQuery(async () => new Set(await db.cards.toCollection().primaryKeys()));
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;
  const profile = useLiveQuery(() => getProfile());
  const [choosing, setChoosing] = useState(false);

  const field = profile?.jobField;
  const myDeck = field ? jobDeck(field) : undefined;
  // Job decks for other fields stay out of the list; they are one tap away under "Change".
  const general = decks.filter((deck) => deck.field === undefined);

  async function choose(next: (typeof JOB_FIELDS)[number]) {
    await saveJobField(next);
    setChoosing(false);
  }

  const tile = (deck: Deck) => {
    const studied = deck.cards.filter((card) => learning?.has(card.id)).length;
    return (
      <a className="deck-tile" href={deckHref(deckId(deck))} data-testid={`deck-${deckId(deck)}`}>
        <span className="badge">{deck.level}</span>
        <strong lang="nb">{deck.title}</strong>
        <span className="muted small">
          {t('learningOf', { n: studied, total: deck.cards.length })}
        </span>
        <progress value={studied} max={deck.cards.length} aria-hidden="true" />
      </a>
    );
  };

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

      {profile && (
        <section className="my-job" aria-labelledby="my-job-heading">
          <div className="section-head">
            <h2 id="my-job-heading">
              {t('myJob')}
              {field && !choosing && <span className="muted small"> · {t(`field_${field}`)}</span>}
            </h2>
            {myDeck && !choosing && (
              <button type="button" className="link" onClick={() => setChoosing(true)}>
                {t('changeJob')}
              </button>
            )}
          </div>
          {myDeck && !choosing ? (
            tile(myDeck)
          ) : (
            <>
              <p className="muted">{t('myJobIntro')}</p>
              <div className="chips" role="group" aria-label={t('myJob')}>
                {JOB_FIELDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="chip"
                    aria-pressed={option === field}
                    onClick={() => void choose(option)}
                  >
                    {t(`field_${option}`)}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <ul className="deck-list">
        {general.map((deck) => (
          <li key={deckId(deck)}>{tile(deck)}</li>
        ))}
      </ul>
    </>
  );
}
