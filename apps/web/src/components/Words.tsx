import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LEVELS } from '@tjuvstart/engine';
import { overallLevel } from '../content/tracks';
import {
  JOB_FIELDS,
  decks,
  deckId,
  jobDeck,
  recommendedDeck,
  type Deck,
  type JobField,
} from '../content/vocab';
import { db } from '../data/db';
import { dueCards, getProfile, saveJobField, wordCounts } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, alphabetHref, deckHref } from '../routing/useHashRoute';

const CHEVRON = (
  <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/**
 * The Words tab. One thing gets the weight: the cards due today when there are any, otherwise
 * the one deck to learn next. Below that, the deck for the learner's line of work, and every
 * general deck grouped by level, with only the learner's own level unfolded.
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
  const level = profile
    ? overallLevel(profile.ratings, profile.answers, profile.startingPoint)
    : 'A2';
  const next = learning ? recommendedDeck(level, learning) : undefined;
  const groups = LEVELS.map((at) => ({
    level: at,
    decks: general.filter((deck) => deck.level === at),
  })).filter((group) => group.decks.length > 0);
  // Fold every level but the learner's own; if that level has no decks, open the nearest below.
  const openLevel =
    groups.find((group) => group.level === level)?.level ??
    groups.filter((group) => LEVELS.indexOf(group.level) < LEVELS.indexOf(level)).at(-1)?.level;

  async function choose(option: JobField) {
    await saveJobField(option);
    setChoosing(false);
  }

  const studiedIn = (deck: Deck) => deck.cards.filter((card) => learning?.has(card.id)).length;

  const deckStatus = (deck: Deck) => {
    const studied = studiedIn(deck);
    return studied > 0 ? (
      <span className="deck-row-progress">
        <progress value={studied} max={deck.cards.length} aria-hidden="true" />
        <span className="muted small">
          {t('learningOf', { n: studied, total: deck.cards.length })}
        </span>
      </span>
    ) : (
      <span className="muted small">{t('deckNotStarted', { total: deck.cards.length })}</span>
    );
  };

  /** A deck row. Inside a level group the level is already in the heading, so no badge. */
  const row = (deck: Deck, showLevel = true) => (
    <a className="deck-row" href={deckHref(deckId(deck))} data-testid={`deck-${deckId(deck)}`}>
      {showLevel && <span className="badge">{deck.level}</span>}
      <span className="deck-row-main">
        <strong lang="nb">{deck.title}</strong>
        {deckStatus(deck)}
      </span>
      {CHEVRON}
    </a>
  );

  const nextDeck = next && (
    <section className="hero next-deck" aria-labelledby="next-deck-heading" data-testid="next-deck">
      <p className="eyebrow">{studiedIn(next) > 0 ? t('deckContinue') : t('deckUpNext')}</p>
      <h2 id="next-deck-heading" lang="nb">
        {next.title}
      </h2>
      <p className="hero-body">
        <span className="badge">{next.level}</span>{' '}
        {studiedIn(next) > 0
          ? t('learningOf', { n: studiedIn(next), total: next.cards.length })
          : t('deckWords', { total: next.cards.length })}
      </p>
      <a className="button" href={deckHref(deckId(next))}>
        {t('learnTheseWords')}
      </a>
    </section>
  );

  return (
    <>
      <header className="page-header">
        <h1>{t('wordCards')}</h1>
        <p className="muted">{t('wordCardsIntro')}</p>
      </header>

      {due > 0 ? (
        <section className="hero due-card" aria-labelledby="due-heading">
          <h2 id="due-heading" className="eyebrow">
            {t('dueDeck')}
          </h2>
          <p className="due-count">{t('dueCount', { n: due })}</p>
          <a className="button" href={deckHref(DUE_DECK)}>
            {t('reviewNow')}
          </a>
          {counts && counts.studying > 0 && (
            <p className="small" data-testid="words-known">
              {t('wordsKnownLine', { known: counts.known, studying: counts.studying })}
            </p>
          )}
        </section>
      ) : (
        <>
          {nextDeck}
          {counts && counts.studying > 0 && (
            <p className="muted small words-known" data-testid="words-known">
              {t('dueDeckEmpty')}{' '}
              {t('wordsKnownLine', { known: counts.known, studying: counts.studying })}
            </p>
          )}
        </>
      )}

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
              <ul className="deck-list job-list" aria-label={t('myJob')}>
                {JOB_FIELDS.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      className="deck-row"
                      aria-pressed={option === field}
                      onClick={() => void choose(option)}
                    >
                      <span className="deck-row-main">
                        <strong>{t(`field_${option}`)}</strong>
                        <span className="muted small">
                          {t('deckWords', { total: jobDeck(option)?.cards.length ?? 0 })}
                        </span>
                      </span>
                      {CHEVRON}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="section-head">
        <h2 className="section-title">{t('decks')}</h2>
        <a href={alphabetHref}>{t('alphabet')}</a>
      </div>
      <div className="deck-groups">
        {groups.map((group) => {
          const started = group.decks.filter((deck) => studiedIn(deck) > 0).length;
          return (
            <details
              key={group.level}
              className="deck-group"
              open={group.level === openLevel}
              data-testid={`deck-group-${group.level}`}
            >
              <summary>
                <span className="badge">{group.level}</span>
                <span>{t('deckGroupCount', { n: group.decks.length })}</span>
                {started > 0 && (
                  <span className="muted small">{t('deckGroupStarted', { n: started })}</span>
                )}
              </summary>
              <ul className="deck-list">
                {group.decks.map((deck) => (
                  <li key={deckId(deck)}>{row(deck, false)}</li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </>
  );
}
