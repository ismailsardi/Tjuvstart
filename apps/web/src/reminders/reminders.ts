import { trollName } from '../components/outfits';
import { db as defaultDb, type DeviceSettings, type TimeOfDay, type TjuvstartDb } from '../data/db';
import { dailyProgress, getProfile } from '../data/progress';
import { translate, type StringKey, type UiLanguage } from '../i18n/strings';
import type { ReminderNotification, ReminderNotifier } from './notifier';
import { REMINDER_ROUTE, planReminders, type PlannedReminder } from './plan';

const DEVICE_ID = 'device';

export async function getDeviceSettings(db: TjuvstartDb = defaultDb): Promise<DeviceSettings> {
  return (await db.device.get(DEVICE_ID)) ?? { id: DEVICE_ID };
}

/** Turns the daily reminder on or off at the given time. */
export async function saveReminder(
  reminder: TimeOfDay & { enabled: boolean },
  db: TjuvstartDb = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.device, async () => {
    const settings = await getDeviceSettings(db);
    await db.device.put({ ...settings, reminder, reminderOfferAnswered: true });
  });
}

/** Records that the learner said no to the one-time offer, so it isn't shown again. */
export async function declineReminderOffer(db: TjuvstartDb = defaultDb): Promise<void> {
  await db.transaction('rw', db.device, async () => {
    await db.device.put({ ...(await getDeviceSettings(db)), reminderOfferAnswered: true });
  });
}

const START_LINES: readonly StringKey[] = ['reminderStart0', 'reminderStart1', 'reminderStart2'];

function bodyKey(reminder: PlannedReminder): StringKey {
  switch (reminder.kind) {
    case 'streak':
      // "Your 1-day streak" reads oddly in every language, so day one gets its own line.
      return reminder.days === 1 ? 'reminderStreakFirst' : 'reminderStreak';
    case 'streakAtRisk':
      return 'reminderStreakAtRisk';
    case 'keep':
      return 'reminderKeep';
    case 'last':
      return 'reminderLast';
    case 'start':
      return START_LINES[reminder.variant % START_LINES.length]!;
  }
}

/** The planned reminders as notifications, written in the learner's language, from their troll. */
export function toNotifications(
  planned: readonly PlannedReminder[],
  language: UiLanguage,
  name: string,
): ReminderNotification[] {
  return planned.map((reminder) => ({
    id: reminder.id,
    at: reminder.at,
    title: name,
    body: translate(language, bodyKey(reminder), { n: reminder.days ?? 0, name }),
    route: REMINDER_ROUTE,
  }));
}

/** The notifications that should be pending right now, from the settings and today's progress. */
export async function currentReminders(
  now: Date,
  language: UiLanguage,
  db: TjuvstartDb = defaultDb,
): Promise<ReminderNotification[]> {
  const [settings, progress, profile] = await Promise.all([
    getDeviceSettings(db),
    dailyProgress(now.getTime(), db),
    getProfile(db),
  ]);
  const reminder = settings.reminder;
  if (!reminder?.enabled) return [];
  return toNotifications(
    planReminders(now, reminder, progress.streak),
    language,
    trollName(profile),
  );
}

/** A fingerprint of a set of notifications, to skip rescheduling when nothing changed. */
export function signature(notifications: readonly ReminderNotification[]): string {
  return JSON.stringify(notifications.map((n) => [n.id, n.at.getTime(), n.title, n.body]));
}

/**
 * Brings the device's pending reminders in line with `notifications`. Without permission it
 * only clears old ones: rescheduling runs in the background, and the system prompt must only
 * ever follow the learner's own tap.
 */
export async function applyReminders(
  notifier: ReminderNotifier,
  notifications: readonly ReminderNotification[],
): Promise<void> {
  if (notifications.length > 0 && (await notifier.permission()) !== 'granted') {
    await notifier.replace([]);
    return;
  }
  await notifier.replace(notifications);
}
