import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'languages' }
  | { name: 'words' }
  | { name: 'review' }
  | { name: 'lesson'; lessonId: string };

/** Hash routes work on GitHub Pages without server rewrites: #/, #/languages, #/words, #/review and #/lesson/<id>. */
export function parseRoute(hash: string): Route {
  if (hash === '#/languages') return { name: 'languages' };
  if (hash === '#/words') return { name: 'words' };
  if (hash === '#/review') return { name: 'review' };
  const match = /^#\/lesson\/([a-z0-9-]+)$/.exec(hash);
  return match?.[1] ? { name: 'lesson', lessonId: match[1] } : { name: 'home' };
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export const lessonHref = (lessonId: string) => `#/lesson/${lessonId}`;
export const homeHref = '#/';
export const languagesHref = '#/languages';
export const wordsHref = '#/words';
export const reviewHref = '#/review';
