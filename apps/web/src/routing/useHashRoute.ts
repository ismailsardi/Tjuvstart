import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'lessons' }
  | { name: 'words' }
  | { name: 'deck'; deckId: string }
  | { name: 'me' }
  | { name: 'placement' }
  | { name: 'practice' }
  | { name: 'languages' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'shadow'; lessonId: string };

/** The review queue across all decks, shown as a deck of its own. */
export const DUE_DECK = 'due';

/** Hash routes work on GitHub Pages without server rewrites. */
export function parseRoute(hash: string): Route {
  switch (hash) {
    case '#/lessons':
      return { name: 'lessons' };
    case '#/words':
      return { name: 'words' };
    case '#/review':
      return { name: 'deck', deckId: DUE_DECK };
    case '#/me':
      return { name: 'me' };
    case '#/placement':
      return { name: 'placement' };
    case '#/practice':
      return { name: 'practice' };
    case '#/languages':
      return { name: 'languages' };
  }
  const lesson = /^#\/lesson\/([a-z0-9-]+)$/.exec(hash);
  if (lesson?.[1]) return { name: 'lesson', lessonId: lesson[1] };
  const shadow = /^#\/shadow\/([a-z0-9-]+)$/.exec(hash);
  if (shadow?.[1]) return { name: 'shadow', lessonId: shadow[1] };
  const deck = /^#\/words\/([a-z0-9-]+)$/.exec(hash);
  if (deck?.[1]) return { name: 'deck', deckId: deck[1] };
  return { name: 'home' };
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export const homeHref = '#/';
export const lessonsHref = '#/lessons';
export const wordsHref = '#/words';
export const meHref = '#/me';
export const languagesHref = '#/languages';
export const lessonHref = (lessonId: string) => `#/lesson/${lessonId}`;
export const shadowHref = (lessonId: string) => `#/shadow/${lessonId}`;
export const deckHref = (deckId: string) => `#/words/${deckId}`;
export const placementHref = '#/placement';
export const practiceHref = '#/practice';
