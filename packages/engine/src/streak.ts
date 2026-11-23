/**
 * A forgiving streak. A day counts once the learner has done a little work (see
 * DAILY_GOAL). Missing one day does not break the streak; missing two days in a row does.
 * Only the days with practice are counted, so a rest day keeps the streak but does not grow it.
 *
 * Days are whole numbers (days since an epoch, in the learner's own time zone), so the rule
 * does not depend on clocks or time zones.
 */

/** Answers, card reviews and shadowed sentences needed for a day to count. */
export const DAILY_GOAL = 8;

export interface Streak {
  /** Days with practice in the current streak, today included. */
  days: number;
  /** Whether today already counts. */
  doneToday: boolean;
  /** Yesterday was missed: skipping today too would end the streak. */
  atRisk: boolean;
}

export function currentStreak(activeDays: Iterable<number>, today: number): Streak {
  const active = new Set(activeDays);
  const doneToday = active.has(today);
  let day = doneToday ? today : today - 1;
  // Today can still be done, and yesterday may be the one forgiven day.
  if (!active.has(day)) day -= 1;

  let days = 0;
  while (true) {
    if (active.has(day)) {
      days += 1;
      day -= 1;
    } else if (days > 0 && active.has(day - 1)) {
      day -= 1;
    } else {
      break;
    }
  }
  return { days, doneToday, atRisk: days > 0 && !doneToday && !active.has(today - 1) };
}
