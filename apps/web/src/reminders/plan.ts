import type { Streak } from '@tjuvstart/engine';
import type { TimeOfDay } from '../data/db';

/** How many days ahead reminders are scheduled. Each app visit schedules the window again. */
export const REMINDER_DAYS = 7;

/**
 * Notification ids used for reminders. They are fixed, so scheduling again replaces the old
 * ones instead of adding to them, and other notifications added later can use other ids.
 */
export const REMINDER_IDS = Array.from({ length: REMINDER_DAYS }, (_, i) => 1001 + i);

/** Where a reminder opens the app: straight into today's session. */
export const REMINDER_ROUTE = '#/daily';

/**
 * What a reminder says. Only today's reminder knows the streak for certain, so only it names
 * the number; later days use wording that is true whatever happens in between.
 */
export type ReminderKind =
  | 'streak' // today, a streak is running and today is not done yet
  | 'streakAtRisk' // today, yesterday was missed: today keeps the streak
  | 'keep' // tomorrow, after a day with a streak running
  | 'start' // any other day, rotating through a few gentle lines
  | 'last'; // the last day in the window: no more reminders until the app is opened again

export interface PlannedReminder {
  id: number;
  at: Date;
  kind: ReminderKind;
  /** Picks one of the 'start' lines, so the same sentence doesn't arrive every day. */
  variant: number;
  /** The streak in days, for 'streak' and 'streakAtRisk'. */
  days?: number;
}

export const START_VARIANTS = 3;

/**
 * The reminders for the next week at the learner's chosen time. Today is skipped once its
 * streak day is earned, or when the time has already passed. If the learner stops opening the
 * app, the reminders stop after a week, with a last one that says so: a nudge, not nagging.
 */
export function planReminders(
  now: Date,
  time: TimeOfDay,
  streak: Pick<Streak, 'days' | 'doneToday' | 'atRisk'>,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (let offset = 0; offset < REMINDER_DAYS; offset += 1) {
    // Built from local calendar parts, so the hour stays put across daylight saving changes.
    const at = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      time.hour,
      time.minute,
    );
    if (offset === 0 && (streak.doneToday || at <= now)) continue;

    const id = REMINDER_IDS[offset]!;
    const variant = (now.getDate() + offset) % START_VARIANTS;
    if (offset === REMINDER_DAYS - 1) {
      planned.push({ id, at, kind: 'last', variant });
    } else if (offset === 0 && streak.days > 0) {
      const kind = streak.atRisk ? 'streakAtRisk' : 'streak';
      planned.push({ id, at, kind, variant, days: streak.days });
    } else if (offset === 1 && (streak.days > 0 || streak.doneToday)) {
      planned.push({ id, at, kind: 'keep', variant });
    } else {
      planned.push({ id, at, kind: 'start', variant });
    }
  }
  return planned;
}

/** Evening suits most learners who work during the day; the time picker is right there. */
export const DEFAULT_REMINDER_TIME: TimeOfDay = { hour: 19, minute: 0 };

/** A default time for the reminder offer: now, rounded to the half hour, kept to waking hours. */
export function suggestedTime(now: Date): TimeOfDay {
  const minutes = Math.round((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
  const clamped = Math.min(Math.max(minutes, 7 * 60), 21 * 60 + 30);
  return { hour: Math.floor(clamped / 60), minute: clamped % 60 };
}

/** "19:30" for an <input type="time">, and back. */
export function toTimeValue({ hour, minute }: TimeOfDay): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function fromTimeValue(value: string): TimeOfDay | undefined {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : undefined;
}

/** The time as the learner's language writes it, for example "7:30 PM" or "19:30". */
export function formatTime(time: TimeOfDay, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, time.hour, time.minute),
  );
}
