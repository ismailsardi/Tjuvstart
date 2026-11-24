import { useEffect, useRef, type RefObject } from 'react';

/**
 * Moves keyboard and screen reader focus to `ref` whenever `key` changes, but not on the first
 * render. Used when a new question replaces the old one: the Continue button that had focus is
 * gone, and without this focus would fall back to the top of the page. An `undefined` key
 * means "nothing new to focus yet", as while feedback is on screen.
 */
export function useFocusOnChange(ref: RefObject<HTMLElement | null>, key: unknown) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (key === undefined) return;
    ref.current?.focus({ preventScroll: false });
  }, [ref, key]);
}
