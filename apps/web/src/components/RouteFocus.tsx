import { useEffect, useRef } from 'react';

/**
 * Hash navigation swaps the page without a reload, so browsers neither announce the new page
 * nor move focus. On every route change after the first, this names the tab after the page's
 * heading and moves focus to that heading, as a full page load would. Rendered inside the
 * Suspense boundary, so it runs once the lazy page is on screen; pages that wait for IndexedDB
 * before showing their heading are picked up as soon as it appears.
 */
export function RouteFocus({ routeKey, home }: { routeKey: string; home: boolean }) {
  const first = useRef(true);
  useEffect(() => {
    const moveFocus = !first.current;
    first.current = false;

    const apply = () => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (!heading) return false;
      const name = heading.textContent?.trim();
      document.title = home || !name ? 'Tjuvstart' : `${name} – Tjuvstart`;
      if (moveFocus) {
        if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
        heading.focus();
      }
      return true;
    };
    if (apply()) return;

    const main = document.querySelector('main');
    if (!main) return;
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const timeout = setTimeout(() => observer.disconnect(), 2000);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [routeKey, home]);
  return null;
}
