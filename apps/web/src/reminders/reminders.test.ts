import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TjuvstartDb } from '../data/db';
import { saveTrollName } from '../data/progress';
import { fakeNotifier } from './fakeNotifier';
import { REMINDER_ROUTE } from './plan';
import {
  applyReminders,
  currentReminders,
  declineReminderOffer,
  getDeviceSettings,
  saveReminder,
  signature,
} from './reminders';

let db: TjuvstartDb;
const morning = new Date(2026, 10, 26, 9, 0);

/** Answers at `at`, enough of them to count as a streak day. */
async function practise(at: Date, answers = 8) {
  for (let i = 0; i < answers; i += 1) {
    await db.attempts.add({
      lessonId: 'l',
      itemId: `i${i}`,
      skill: 'reading',
      correct: true,
      ratingAfter: 1000,
      at: at.getTime() + i,
    });
  }
}

beforeEach(() => {
  db = new TjuvstartDb(`reminders-${Math.random()}`);
});

afterEach(async () => {
  await db.delete();
});

describe('device settings', () => {
  it('keep the reminder apart from the synced profile', async () => {
    await saveReminder({ enabled: true, hour: 8, minute: 15 }, db);
    expect(await getDeviceSettings(db)).toMatchObject({
      reminder: { enabled: true, hour: 8, minute: 15 },
      reminderOfferAnswered: true,
    });
    expect((await db.profiles.toArray()).some((p) => 'reminder' in p)).toBe(false);
  });

  it('remember a declined offer', async () => {
    await declineReminderOffer(db);
    expect((await getDeviceSettings(db)).reminderOfferAnswered).toBe(true);
    expect((await getDeviceSettings(db)).reminder).toBeUndefined();
  });
});

describe('currentReminders', () => {
  it('is empty until the learner turns reminders on', async () => {
    expect(await currentReminders(morning, 'en', db)).toEqual([]);
    await saveReminder({ enabled: false, hour: 19, minute: 0 }, db);
    expect(await currentReminders(morning, 'en', db)).toEqual([]);
  });

  it('comes from the troll, in the learner’s language, and opens today’s session', async () => {
    await saveTrollName('Fjellfrid', db);
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    const [today] = await currentReminders(morning, 'fr', db);
    expect(today).toMatchObject({ title: 'Fjellfrid', route: REMINDER_ROUTE });
    expect(today?.body).toMatch(/norvégien|jour/);
  });

  it('names a running streak and drops today once it is earned', async () => {
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    for (const daysAgo of [3, 2, 1]) {
      await practise(new Date(2026, 10, 26 - daysAgo, 12, 0));
    }
    const before = await currentReminders(morning, 'en', db);
    expect(before[0]?.body).toBe(
      'Your 3-day streak is waiting. A few minutes today keeps it going.',
    );
    expect(before[0]?.at.getDate()).toBe(26);

    await practise(new Date(2026, 10, 26, 8, 30));
    const after = await currentReminders(morning, 'en', db);
    expect(after[0]?.at.getDate()).toBe(27);
    expect(after[0]?.body).toMatch(/^Keep your streak going/);
  });

  it('gives day one its own line', async () => {
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    await practise(new Date(2026, 10, 25, 12, 0));
    const [today] = await currentReminders(morning, 'en', db);
    expect(today?.body).toBe('Yesterday was day one. Practise today and make it two.');
  });
});

describe('applyReminders', () => {
  it('schedules when notifications are allowed', async () => {
    const fake = fakeNotifier('granted');
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    const notifications = await currentReminders(morning, 'en', db);
    await applyReminders(fake.notifier, notifications);
    expect(fake.state.pending).toHaveLength(7);
    expect(fake.state.prompts).toBe(0);
  });

  it('never prompts on its own, and clears reminders it may no longer show', async () => {
    const fake = fakeNotifier('prompt');
    fake.state.pending = [
      { id: 1001, at: morning, title: 'Tusse', body: 'old', route: REMINDER_ROUTE },
    ];
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    await applyReminders(fake.notifier, await currentReminders(morning, 'en', db));
    expect(fake.state.prompts).toBe(0);
    expect(fake.state.pending).toEqual([]);
  });

  it('gives the same signature for the same reminders', async () => {
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    const a = await currentReminders(morning, 'en', db);
    const b = await currentReminders(new Date(morning.getTime() + 60_000), 'en', db);
    expect(signature(a)).toBe(signature(b));
    expect(signature(a)).not.toBe(signature(await currentReminders(morning, 'de', db)));
  });
});
