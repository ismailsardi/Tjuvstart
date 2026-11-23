import { useCallback, useEffect, useState } from 'react';
import type { LanguagePack } from '../content/packs';
import { cardLabel, getCard, getDeck } from '../content/vocab';
import { db } from '../data/db';
import { addCards, dueCards, reviewCard } from '../data/progress';
import { useI18n } from '../i18n/useI18n';
import { DUE_DECK, wordsHref } from '../routing/useHashRoute';
import { SpeakButton } from './SpeakButton';
import { SwipeCard, type SwipeDirection } from './SwipeCard';

interface Session {
  queue: string[];
  /** Cards that were not in the learner's review deck when the session started. */
  fresh: Set<string>;
}

/** The cards to go through: due cards, or a deck's new cards followed by its due ones. */
async function buildSession(deckId: string, now: number): Promise<Session> {
  const due = (await dueCards(now)).map((progress) => progress.cardId);
  if (deckId === DUE_DECK) return { queue: due, fresh: new Set() };

  const ids = getDeck(deckId)?.cards.map((card) => card.id) ?? [];
  const learning = new Set(await db.cards.toCollection().primaryKeys());
  const fresh = ids.filter((id) => !learning.has(id));
  const dueHere = ids.filter((id) => due.includes(id));
  return { queue: [...fresh, ...dueHere], fresh: new Set(fresh) };
}

/**
 * A swipe session over one deck. Swiping right means "know it", left means "again".
 * Inside the daily session it takes at most `limit` cards and hands over to `onFinish`
 * instead of showing its own end screen.
 */
export function DeckSession({
  deckId,
  packs = [],
  limit,
  onFinish,
}: {
  deckId: string;
  packs?: readonly LanguagePack[];
  limit?: number;
  onFinish?: () => void;
}) {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null);
  const [tally, setTally] = useState({ known: 0, again: 0 });

  useEffect(() => {
    void buildSession(deckId, Date.now()).then((built) =>
      setSession(limit === undefined ? built : { ...built, queue: built.queue.slice(0, limit) }),
    );
  }, [deckId, limit]);

  const cardId = session?.queue[index];
  const card = cardId ? getCard(cardId) : undefined;

  const answer = useCallback(
    async (direction: SwipeDirection) => {
      if (!session || !cardId) return;
      const grade = direction === 'right' ? 'good' : 'again';
      if (session.fresh.has(cardId)) await addCards([cardId]);
      await reviewCard(cardId, grade);
      setTally((n) =>
        direction === 'right' ? { ...n, known: n.known + 1 } : { ...n, again: n.again + 1 },
      );
      if (direction === 'left' && session.queue.indexOf(cardId) === index) {
        // A missed card comes back once at the end of the session.
        setSession({ ...session, queue: [...session.queue, cardId], fresh: new Set() });
      }
      setFlipped(false);
      setLeaving(null);
      setIndex((i) => i + 1);
    },
    [session, cardId, index],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!card || leaving) return;
      if (event.key === 'ArrowRight') setLeaving('right');
      if (event.key === 'ArrowLeft') setLeaving('left');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => void answer(leaving), 220);
    return () => window.clearTimeout(timer);
  }, [leaving, answer]);

  const finished = session !== null && !card;
  useEffect(() => {
    if (finished) onFinish?.();
  }, [finished, onFinish]);

  if (!session || (finished && onFinish)) return null;

  const title = deckId === DUE_DECK ? t('dueDeck') : getDeck(deckId)?.title;
  const total = session.queue.length;

  return (
    <article className="deck-session" aria-labelledby="deck-heading">
      <a href={wordsHref} className="back-link">
        {t('backToWords')}
      </a>
      <h1 id="deck-heading" lang={deckId === DUE_DECK ? undefined : 'nb'}>
        {title}
      </h1>

      {total === 0 ? (
        <p role="status" className="panel">
          {deckId === DUE_DECK ? t('nothingDue') : t('deckEmpty')}
        </p>
      ) : !card ? (
        <div role="status" className="panel done-panel">
          <h2>{t('deckDone')}</h2>
          <p>{t('deckDoneBody', tally)}</p>
          <a className="button" href={wordsHref}>
            {t('backToWords').replace('← ', '')}
          </a>
        </div>
      ) : (
        <>
          <progress value={index} max={total} aria-label={t('cardOf', { n: index + 1, total })} />
          <p className="muted small">{t('cardOf', { n: index + 1, total })}</p>
          <div className="card-stack">
            {session.queue[index + 1] && <div className="stack-shadow two" aria-hidden="true" />}
            {session.queue[index + 2] && <div className="stack-shadow three" aria-hidden="true" />}
            <SwipeCard
              key={`${card.id}-${index}`}
              card={card}
              packs={packs}
              flipped={flipped}
              leaving={leaving}
              onFlip={() => setFlipped((f) => !f)}
              onSwipe={(direction) => void answer(direction)}
            />
          </div>
          <div className="text-tools center">
            <SpeakButton
              key={`${card.id}-${flipped ? 'example' : 'word'}`}
              text={flipped ? card.example : cardLabel(card)}
            />
          </div>
          <p className="muted small hint">{t('swipeHint')}</p>
          <div className="swipe-actions">
            <button type="button" className="round again" onClick={() => setLeaving('left')}>
              <span aria-hidden="true">✕</span>
              <span>{t('again')}</span>
            </button>
            <button type="button" className="round flip" onClick={() => setFlipped((f) => !f)}>
              <span aria-hidden="true">↻</span>
              <span>{t('flip')}</span>
            </button>
            <button type="button" className="round know" onClick={() => setLeaving('right')}>
              <span aria-hidden="true">✓</span>
              <span>{t('knowIt')}</span>
            </button>
          </div>
        </>
      )}
    </article>
  );
}
