import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DAY_MS } from '@tjuvstart/engine';
import { db as defaultDb, type TjuvstartDb } from '../data/db';
import { useI18n } from '../i18n/useI18n';
import { deviceNotifier, type ReminderNotifier } from './notifier';
import { applyReminders, currentReminders, signature } from './reminders';

/** Milliseconds until the next local midnight, when today's reminder rules change. */
function untilMidnight(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - now + 1000;
}

function openRoute(route: string) {
  window.location.hash = route;
}

/**
 * Keeps the device's reminders in step with the learner, in the iOS app only. It renders
 * nothing. Reminders are scheduled again whenever something they depend on changes: the
 * settings, today's progress (finishing the day's practice drops today's reminder), the troll's
 * name, the interface language, and the date (on return to the app and at midnight).
 */
export function ReminderScheduler({
  notifier = deviceNotifier,
  db = defaultDb,
  navigate = openRoute,
}: {
  notifier?: ReminderNotifier;
  db?: TjuvstartDb;
  navigate?: (route: string) => void;
}) {
  const { language } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const applied = useRef<string | undefined>(undefined);

  // Coming back to the app may be a new day, and the learner may have changed notification
  // permission in Settings meanwhile, so both count as a reason to look again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      applied.current = undefined;
      setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    const midnight = setTimeout(() => setNow(Date.now()), Math.min(untilMidnight(now), DAY_MS));
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(midnight);
    };
  }, [now]);

  useEffect(() => notifier.onOpen(navigate), [notifier, navigate]);

  // Every write to the tables below reruns this query; the signature check keeps the device
  // from being rescheduled when the outcome is the same.
  const notifications = useLiveQuery(
    () => currentReminders(new Date(now), language, db),
    [now, language, db],
  );

  useEffect(() => {
    if (!notifications) return;
    const next = signature(notifications);
    if (next === applied.current) return;
    applied.current = next;
    applyReminders(notifier, notifications).catch(() => {
      // Try again on the next change rather than giving up for the session.
      applied.current = undefined;
    });
  }, [notifications, notifier]);

  return null;
}
