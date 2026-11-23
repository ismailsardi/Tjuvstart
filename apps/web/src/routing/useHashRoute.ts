import { useSyncExternalStore } from 'react';

export type Route = { name: 'home' } | { name: 'lesson'; lessonId: string };

/** Hash routes work on GitHub Pages without server rewrites: #/ and #/lesson/<id>. */
export function parseRoute(hash: string): Route {
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
