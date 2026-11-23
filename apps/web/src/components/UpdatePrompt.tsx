import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../i18n/useI18n';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Offers to reload when a new build has been downloaded in the background.
 * Without this, the service worker keeps serving the cached build until every tab is closed.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="alert">
      <span>{t('updateAvailable')}</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        {t('reload')}
      </button>
    </div>
  );
}
