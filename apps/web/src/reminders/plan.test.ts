import { describe, expect, it } from 'vitest';
import {
  REMINDER_DAYS,
  REMINDER_IDS,
  formatTime,
  fromTimeValue,
  planReminders,
  suggestedTime,
  toTimeValue,
} from './plan';

const evening = { hour: 19, minute: 30 };
const noStreak = { days: 0, doneToday: false, atRisk: false };

describe('planReminders', () => {
  it('schedules one reminder a day for a week at the chosen local time', () => {
    const planned = planReminders(new Date(2026, 10, 26, 9, 0), evening, noStreak);
    expect(planned).toHaveLength(REMINDER_DAYS);
    expect(planned.map((r) => r.id)).toEqual(REMINDER_IDS);
    planned.forEach((reminder, offset) => {
      expect(reminder.at.getDate()).toBe(new Date(2026, 10, 26 + offset).getDate());
      expect([reminder.at.getHours(), reminder.at.getMinutes()]).toEqual([19, 30]);
    });
  });

  it('keeps the hour across a daylight saving change', () => {
    // Europe moves its clocks on the last Sunday of March.
    const planned = planReminders(new Date(2027, 2, 25, 9, 0), evening, noStreak);
    for (const reminder of planned) expect(reminder.at.getHours()).toBe(19);
  });

  it('skips today once the streak day is earned', () => {
    const planned = planReminders(new Date(2026, 10, 26, 9, 0), evening, {
      days: 4,
      doneToday: true,
      atRisk: false,
    });
    expect(planned).toHaveLength(REMINDER_DAYS - 1);
    expect(planned[0]).toMatchObject({ id: REMINDER_IDS[1], kind: 'keep' });
  });

  it('skips today when the time has already passed', () => {
    const planned = planReminders(new Date(2026, 10, 26, 20, 0), evening, noStreak);
    expect(planned[0]?.at.getDate()).toBe(27);
  });

  it('names the streak only on today’s reminder', () => {
    const now = new Date(2026, 10, 26, 9, 0);
    const planned = planReminders(now, evening, { days: 5, doneToday: false, atRisk: false });
    expect(planned[0]).toMatchObject({ kind: 'streak', days: 5 });
    expect(planned[1]).toMatchObject({ kind: 'keep' });
    expect(planned.slice(2).every((r) => r.days === undefined)).toBe(true);
  });

  it('says so when yesterday was missed and today keeps the streak', () => {
    const planned = planReminders(new Date(2026, 10, 26, 9, 0), evening, {
      days: 3,
      doneToday: false,
      atRisk: true,
    });
    expect(planned[0]?.kind).toBe('streakAtRisk');
  });

  it('ends the week with a last reminder and rotates the lines in between', () => {
    const planned = planReminders(new Date(2026, 10, 26, 9, 0), evening, noStreak);
    expect(planned.at(-1)?.kind).toBe('last');
    const starts = planned.filter((r) => r.kind === 'start');
    expect(new Set(starts.map((r) => r.variant)).size).toBeGreaterThan(1);
  });
});

describe('suggestedTime', () => {
  it('rounds to the half hour', () => {
    expect(suggestedTime(new Date(2026, 0, 1, 18, 44))).toEqual({ hour: 18, minute: 30 });
    expect(suggestedTime(new Date(2026, 0, 1, 18, 46))).toEqual({ hour: 19, minute: 0 });
  });

  it('stays within waking hours', () => {
    expect(suggestedTime(new Date(2026, 0, 1, 1, 10))).toEqual({ hour: 7, minute: 0 });
    expect(suggestedTime(new Date(2026, 0, 1, 23, 50))).toEqual({ hour: 21, minute: 30 });
  });
});

describe('time values', () => {
  it('round-trips the time input format', () => {
    expect(toTimeValue({ hour: 7, minute: 5 })).toBe('07:05');
    expect(fromTimeValue('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(fromTimeValue('')).toBeUndefined();
    expect(fromTimeValue('25:00')).toBeUndefined();
  });

  it('formats the time the way the language writes it', () => {
    expect(formatTime({ hour: 19, minute: 0 }, 'en')).toMatch(/^7:00\sPM$/);
    expect(formatTime({ hour: 19, minute: 0 }, 'fr')).toBe('19:00');
  });
});
