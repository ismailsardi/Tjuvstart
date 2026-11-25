import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { JOB_FIELDS, decks, deckId, jobDeck, type Deck } from '../content/vocab';
import { db } from '../data/db';
import { dueCards, getProfile, saveJobField, wordCounts } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, deckHref } from '../routing/useHashRoute';
import { AlphabetRow } from './AlphabetRow';

/**
 * The Words tab: today's review, the deck for the learner's line of work, then every general
 * deck with how much of it is being learned.
 */
export function Words() {
  const { t } = useI18n();
  const learning = useLiveQuery(async () => new Set(await db.cards.toCollection().primaryKeys()));
  const due = useLiveQuery(() => dueCards().then((cards) => cards.length)) ?? 0;
  const profile = useLiveQuery(() => getProfile());
  const counts = useLiveQuery(() => wordCounts());
  const [choosing, setChoosing] = useState(false);

  const field = profile?.jobField;
  const myDeck = field ? jobDeck(field) : undefined;
  // Job decks for other fields stay out of the list; they are one tap away under "Change".
  const general = decks.filter((deck) => deck.field === undefined);

  async function choose(next: (typeof JOB_FIELDS)[number]) {
    await saveJobField(next);
    setChoosing(false);
  }

  const row = (deck: Deck) => {
    const studied = deck.cards.filter((card) => learning?.has(card.id)).length;
    return (
      <a className="deck-row" href={deckHref(deckId(deck))} data-testid={`deck-${deckId(deck)}`}>
        <span className="badge">{deck.level}</span>
        <span className="deck-row-main">
          <strong lang="nb">{deck.title}</strong>
          {studied > 0 ? (
            <span className="deck-row-progress">
              <progress value={studied} max={deck.cards.length} aria-hidden="true" />
              <span className="muted small">
                {t('learningOf', { n: studied, total: deck.cards.length })}
              </span>
            </span>
          ) : (
            <span className="muted small">{t('deckNotStarted', { total: deck.cards.length })}</span>
          )}
        </span>
        <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </a>
    );
  };

  return (
    <>
      <header className="page-header">
        <h1>{t('wordCards')}</h1>
        <p className="muted">{t('wordCardsIntro')}</p>
      </header>

      <section className="panel due-card" aria-labelledby="due-heading">
        <h2 id="due-heading" className="eyebrow">
          {t('dueDeck')}
        </h2>
        {due > 0 ? (
          <>
            <p className="due-count">{t('dueCount', { n: due })}</p>
            <a className="button" href={deckHref(DUE_DECK)}>
              {t('reviewNow')}
            </a>
          </>
        ) : (
          <p className="muted">{t('dueDeckEmpty')}</p>
        )}
        {counts && counts.studying > 0 && (
          <p className="muted small" data-testid="words-known">
            {t('wordsKnownLine', { known: counts.known, studying: counts.studying })}
          </p>
        )}
      </section>

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
            <div className="deck-list">{row(myDeck)}</div>
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

      <h2 className="section-title">{t('decks')}</h2>
      <ul className="deck-list">
        <li>
          <AlphabetRow />
        </li>
        {general.map((deck) => (
          <li key={deckId(deck)}>{row(deck)}</li>
        ))}
      </ul>
    </>
  );
}
