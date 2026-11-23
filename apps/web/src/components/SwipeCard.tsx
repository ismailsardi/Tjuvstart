import { useRef, useState, type PointerEvent } from 'react';
import type { LanguagePack } from '../content/packs';
import type { Card } from '../content/vocab';
import { useI18n } from '../i18n/useI18n';
import { WordCard } from './WordCard';

export type SwipeDirection = 'left' | 'right';

/** How far, in pixels, a card must travel to count as a swipe. */
const SWIPE_DISTANCE = 90;
/** Movement below this is a tap, which flips the card. */
const TAP_SLOP = 6;
const LEAVE_MS = 220;

interface Props {
  card: Card;
  packs: readonly LanguagePack[];
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: SwipeDirection) => void;
  /** Set by the parent when a button or key triggers the swipe. */
  leaving?: SwipeDirection | null;
}

/** The top card of a deck: tap to flip, drag sideways to answer. */
export function SwipeCard({ card, packs, flipped, onFlip, onSwipe, leaving }: Props) {
  const { t } = useI18n();
  const start = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<SwipeDirection | null>(null);
  const direction = exit ?? leaving ?? null;

  function release(event: PointerEvent) {
    if (start.current === null) return;
    const moved = event.clientX - start.current;
    start.current = null;
    setDragging(false);
    if (Math.abs(moved) < TAP_SLOP) {
      setDx(0);
      onFlip();
    } else if (Math.abs(moved) >= SWIPE_DISTANCE) {
      const swipe: SwipeDirection = moved > 0 ? 'right' : 'left';
      setExit(swipe);
      window.setTimeout(() => onSwipe(swipe), LEAVE_MS);
    } else {
      setDx(0);
    }
  }

  const offset = direction ? (direction === 'right' ? 1 : -1) * 600 : dx;
  const style = {
    transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
    transition: dragging ? 'none' : `transform ${LEAVE_MS}ms ease-out`,
  };
  const know = Math.max(0, Math.min(1, offset / SWIPE_DISTANCE));
  const again = Math.max(0, Math.min(1, -offset / SWIPE_DISTANCE));

  return (
    <div
      className="swipe-card"
      style={style}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      data-testid="swipe-card"
      onPointerDown={(event) => {
        start.current = event.clientX;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current !== null) setDx(event.clientX - start.current);
      }}
      onPointerUp={release}
      onPointerCancel={() => {
        start.current = null;
        setDragging(false);
        setDx(0);
      }}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onFlip();
        }
      }}
    >
      <span className="stamp know" style={{ opacity: know }} aria-hidden="true">
        {t('knowIt')}
      </span>
      <span className="stamp again" style={{ opacity: again }} aria-hidden="true">
        {t('again')}
      </span>
      <WordCard card={card} packs={packs} flipped={flipped} />
    </div>
  );
}
