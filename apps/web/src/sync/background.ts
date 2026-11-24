import { db as defaultDb, type TjuvstartDb } from '../data/db';
import { SignedOutError, SyncApiClient } from './api';
import { syncOnce } from './sync';

/** Base URL of the sync API, set at build time. Without it the app is guest-only, as before. */
export const SYNC_API_URL: string | undefined = import.meta.env.VITE_SYNC_API_URL || undefined;

const INTERVAL_MS = 5 * 60_000;

/**
 * Syncs in the background while a learner is signed in: at start-up, when the device comes
 * back online, when the app is hidden, and every few minutes. Lessons never wait on it, and
 * any failure (offline, cold start, server down) just waits for the next round.
 */
export function startBackgroundSync(url = SYNC_API_URL, db: TjuvstartDb = defaultDb): () => void {
  if (!url) return () => undefined;
  const api = new SyncApiClient(url, db);
  let running: Promise<unknown> | undefined;

  const run = () => {
    running ??= (async () => {
      try {
        if (!(await db.syncState.get('sync'))?.session) return;
        await syncOnce(db, api);
      } catch (error) {
        if (!(error instanceof SignedOutError)) console.warn('Sync failed; will retry.', error);
      } finally {
        running = undefined;
      }
    })();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') run();
  };

  run();
  const timer = setInterval(run, INTERVAL_MS);
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearInterval(timer);
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
