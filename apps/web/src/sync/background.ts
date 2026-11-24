import { db as defaultDb, type TjuvstartDb } from '../data/db';
import { SignedOutError, SyncApiClient } from './api';
import { syncOnce } from './sync';

/** Base URL of the sync API, set at build time. Without it the app is guest-only, as before. */
export const SYNC_API_URL: string | undefined = import.meta.env.VITE_SYNC_API_URL || undefined;

/** Client ID of the Google OAuth web client, set at build time. Sign-in is hidden without it. */
export const GOOGLE_CLIENT_ID: string | undefined =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;

const INTERVAL_MS = 5 * 60_000;

/** The app's sync client, or undefined when the build has no sync API. */
export const syncClient = SYNC_API_URL ? new SyncApiClient(SYNC_API_URL, defaultDb) : undefined;

let running: Promise<void> | undefined;

/**
 * Runs one sync round now, or joins the one in progress. Errors other than an ended session
 * are logged and swallowed: the next round tries again.
 */
export function syncNow(api = syncClient, db: TjuvstartDb = defaultDb): Promise<void> {
  if (!api) return Promise.resolve();
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
  return running;
}

/**
 * Syncs in the background while a learner is signed in: at start-up, when the device comes
 * back online, when the app is hidden, and every few minutes. Lessons never wait on it, and
 * any failure (offline, cold start, server down) just waits for the next round.
 */
export function startBackgroundSync(api = syncClient, db: TjuvstartDb = defaultDb): () => void {
  if (!api) return () => undefined;
  const run = () => void syncNow(api, db);
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
