import { useEffect, useId, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as defaultDb, type TjuvstartDb } from '../data/db';
import { useI18n } from '../i18n/useI18n';
import { isNativeApp } from '../native/platform';
import {
  deviceNotifier,
  type NotificationPermission,
  type ReminderNotifier,
} from '../reminders/notifier';
import {
  DEFAULT_REMINDER_TIME,
  formatTime,
  fromTimeValue,
  suggestedTime,
  toTimeValue,
} from '../reminders/plan';
import { declineReminderOffer, getDeviceSettings, saveReminder } from '../reminders/reminders';

interface ReminderProps {
  notifier?: ReminderNotifier;
  db?: TjuvstartDb;
  /** Reminders need the iOS app. Tests set this to show them in jsdom. */
  available?: boolean;
}

/** The notification permission, checked again whenever the learner comes back to the app. */
function usePermission(notifier: ReminderNotifier, enabled: boolean) {
  const [permission, setPermission] = useState<NotificationPermission>();
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      notifier
        .permission()
        .then((state) => current && setPermission(state))
        .catch(() => undefined);
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => {
      current = false;
      document.removeEventListener('visibilitychange', check);
    };
  }, [notifier, enabled]);
  return [permission, setPermission] as const;
}

/**
 * Turns on the daily reminder and picks its time. Saves on change. The system permission
 * prompt only appears when the learner switches the reminder on.
 */
export function ReminderSettings({
  notifier = deviceNotifier,
  db = defaultDb,
  available = isNativeApp(),
}: ReminderProps) {
  const { t } = useI18n();
  const settings = useLiveQuery(() => getDeviceSettings(db), [db]);
  const [permission, setPermission] = usePermission(notifier, available);
  const [busy, setBusy] = useState(false);
  const timeId = useId();
  if (!available || !settings) return null;

  const reminder = settings.reminder ?? { enabled: false, ...DEFAULT_REMINDER_TIME };
  const blocked = permission === 'denied';

  async function toggle(enabled: boolean) {
    if (!enabled) {
      await saveReminder({ ...reminder, enabled: false }, db);
      return;
    }
    setBusy(true);
    try {
      const state = await notifier.requestPermission();
      setPermission(state);
      if (state === 'granted') await saveReminder({ ...reminder, enabled: true }, db);
    } catch {
      // The switch simply stays off; the learner can try again.
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="reminder-settings" data-testid="reminder-settings">
      <legend>{t('reminderTitle')}</legend>
      <p className="muted small">{t('reminderIntro')}</p>
      <label className="choice">
        <input
          type="checkbox"
          role="switch"
          // Safari draws a checkbox with the switch attribute as the native iOS switch.
          {...{ switch: '' }}
          checked={reminder.enabled && !blocked}
          disabled={busy}
          onChange={(event) => void toggle(event.target.checked)}
        />
        <span>{t('reminderOn')}</span>
      </label>
      <div className="reminder-time">
        <label htmlFor={timeId}>{t('reminderTime')}</label>
        <input
          id={timeId}
          type="time"
          step={300}
          value={toTimeValue(reminder)}
          disabled={!reminder.enabled || blocked}
          onChange={(event) => {
            const time = fromTimeValue(event.target.value);
            if (time) void saveReminder({ ...reminder, ...time }, db);
          }}
        />
      </div>
      {blocked && (
        <p className="small" role="status">
          {t('reminderBlocked')}
        </p>
      )}
    </fieldset>
  );
}

/**
 * A one-time offer on Today, shown the first time the learner meets their daily goal in the iOS
 * app: the moment the reminder is easiest to see the point of. It suggests the time they just
 * practised at. Either answer hides it for good; the settings stay on the goal page.
 */
export function ReminderOffer({
  notifier = deviceNotifier,
  db = defaultDb,
  available = isNativeApp(),
  now = new Date(),
}: ReminderProps & { now?: Date }) {
  const { t, language } = useI18n();
  const settings = useLiveQuery(() => getDeviceSettings(db), [db]);
  const [time] = useState(() => suggestedTime(now));
  const [result, setResult] = useState<'set' | 'blocked'>();
  if (!available || !settings) return null;
  if (settings.reminderOfferAnswered && !result) return null;

  const label = formatTime(time, language);
  if (result) {
    return (
      <p className="reminder-offer small" role="status">
        {result === 'set' ? t('reminderSet', { time: label }) : t('reminderBlocked')}
      </p>
    );
  }

  async function accept() {
    const state = await notifier.requestPermission().catch(() => 'denied' as const);
    if (state === 'granted') {
      await saveReminder({ enabled: true, ...time }, db);
      setResult('set');
    } else {
      await declineReminderOffer(db);
      setResult('blocked');
    }
  }

  return (
    <section className="reminder-offer" aria-labelledby="reminder-offer-heading">
      <h2 id="reminder-offer-heading">{t('reminderOfferTitle')}</h2>
      <p className="muted small">{t('reminderOfferBody', { time: label })}</p>
      <div className="button-row">
        <button type="button" className="secondary" onClick={() => void accept()}>
          {t('reminderOfferYes', { time: label })}
        </button>
        <button type="button" className="link" onClick={() => void declineReminderOffer(db)}>
          {t('reminderOfferNo')}
        </button>
      </div>
    </section>
  );
}
