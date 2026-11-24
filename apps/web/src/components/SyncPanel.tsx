import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as defaultDb, type TjuvstartDb } from '../data/db';
import { useI18n } from '../i18n/useI18n';
import type { SyncApiClient } from '../sync/api';
import { GOOGLE_CLIENT_ID, syncClient, syncNow } from '../sync/background';
import { renderGoogleButton } from '../sync/google';

interface SyncPanelProps {
  api?: SyncApiClient;
  googleClientId?: string;
  db?: TjuvstartDb;
  /** Renders the sign-in button; replaced in tests so they don't load Google's script. */
  renderButton?: typeof renderGoogleButton;
}

/**
 * Optional account for syncing progress between devices. Hidden unless the build has a sync
 * API and a Google client ID, so guest-only builds look exactly as before.
 */
export function SyncPanel({
  api = syncClient,
  googleClientId = GOOGLE_CLIENT_ID,
  db = defaultDb,
  renderButton = renderGoogleButton,
}: SyncPanelProps) {
  const { t, language } = useI18n();
  const state = useLiveQuery(async () => (await db.syncState.get('sync')) ?? null, [db]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const signedIn = Boolean(state?.session);
  const loaded = state !== undefined;
  const signInFailed = t('syncSignInFailed');
  const googleUnavailable = t('syncGoogleUnavailable');

  useEffect(() => {
    if (!api || !googleClientId || !loaded || signedIn || !buttonRef.current) return;
    buttonRef.current.replaceChildren();
    renderButton(buttonRef.current, googleClientId, language, (idToken) => {
      setError(undefined);
      setBusy(true);
      api
        .signIn('google', idToken)
        .then(() => syncNow(api, db))
        .catch(() => setError(signInFailed))
        .finally(() => setBusy(false));
    }).catch(() => setError(googleUnavailable));
  }, [
    api,
    googleClientId,
    loaded,
    signedIn,
    language,
    db,
    renderButton,
    signInFailed,
    googleUnavailable,
  ]);

  if (!api || !googleClientId || state === undefined) return null;

  async function run(work: () => Promise<void>) {
    setError(undefined);
    setBusy(true);
    try {
      await work();
    } catch {
      setError(t('syncActionFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    const blob = await api!.exportAccount();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tjuvstart-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel" aria-labelledby="me-sync">
      <h2 id="me-sync">{t('syncTitle')}</h2>
      {!signedIn ? (
        <>
          <p className="muted small">{t('syncIntro')}</p>
          <div ref={buttonRef} data-testid="google-button" aria-busy={busy} />
        </>
      ) : (
        <>
          <p data-testid="sync-status">
            {state?.lastSyncedAt
              ? t('syncLast', { time: new Date(state.lastSyncedAt).toLocaleString(language) })
              : t('syncPending')}
          </p>
          <div className="button-row">
            <button type="button" disabled={busy} onClick={() => void run(() => syncNow(api, db))}>
              {t('syncNow')}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void run(download)}
            >
              {t('syncExport')}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void run(() => api.signOut())}
            >
              {t('syncSignOut')}
            </button>
          </div>
          {!confirmDelete ? (
            <button type="button" className="link danger" onClick={() => setConfirmDelete(true)}>
              {t('syncDelete')}
            </button>
          ) : (
            <div role="alertdialog" aria-labelledby="sync-delete-warning" className="confirm">
              <p id="sync-delete-warning">{t('syncDeleteWarning')}</p>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() =>
                  void run(() => api.deleteAccount()).then(() => setConfirmDelete(false))
                }
              >
                {t('syncDeleteConfirm')}
              </button>
              <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
                {t('syncDeleteCancel')}
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
