import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { TjuvstartDb } from '../data/db';
import { fakeNotifier } from './fakeNotifier';
import { REMINDER_ROUTE } from './plan';
import { saveReminder } from './reminders';
import { ReminderScheduler } from './ReminderScheduler';

let db: TjuvstartDb;

beforeEach(() => {
  db = new TjuvstartDb(`scheduler-${Math.random()}`);
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

describe('ReminderScheduler', () => {
  it('schedules when the learner turns reminders on and clears them when turned off', async () => {
    const fake = fakeNotifier('granted');
    render(<ReminderScheduler notifier={fake.notifier} db={db} />);
    await waitFor(() => expect(fake.state.replaced).toBe(1));
    expect(fake.state.pending).toEqual([]);

    await saveReminder({ enabled: true, hour: 23, minute: 59 }, db);
    await waitFor(() => expect(fake.state.pending.length).toBeGreaterThan(0));

    await saveReminder({ enabled: false, hour: 23, minute: 59 }, db);
    await waitFor(() => expect(fake.state.pending).toEqual([]));
  });

  it('leaves the device alone when nothing changed', async () => {
    const fake = fakeNotifier('granted');
    await saveReminder({ enabled: true, hour: 23, minute: 59 }, db);
    render(<ReminderScheduler notifier={fake.notifier} db={db} />);
    await waitFor(() => expect(fake.state.replaced).toBe(1));
    // A write that changes nothing the reminders depend on.
    await saveReminder({ enabled: true, hour: 23, minute: 59 }, db);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fake.state.replaced).toBe(1);
  });

  it('opens the route of a tapped reminder', async () => {
    const fake = fakeNotifier('granted');
    const navigate = vi.fn();
    render(<ReminderScheduler notifier={fake.notifier} db={db} navigate={navigate} />);
    fake.tap(REMINDER_ROUTE);
    expect(navigate).toHaveBeenCalledWith(REMINDER_ROUTE);
  });
});
