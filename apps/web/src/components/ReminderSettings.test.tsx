import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TjuvstartDb } from '../data/db';
import { fakeNotifier } from '../reminders/fakeNotifier';
import { getDeviceSettings, saveReminder } from '../reminders/reminders';
import { ReminderOffer, ReminderSettings } from './ReminderSettings';

let db: TjuvstartDb;

beforeEach(() => {
  db = new TjuvstartDb(`reminder-ui-${Math.random()}`);
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

describe('ReminderSettings', () => {
  it('is hidden outside the iOS app', () => {
    const { container } = render(
      <ReminderSettings notifier={fakeNotifier().notifier} db={db} available={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('asks for permission when switched on, then saves the reminder', async () => {
    const fake = fakeNotifier('prompt');
    render(<ReminderSettings notifier={fake.notifier} db={db} available />);
    const toggle = await screen.findByRole<HTMLInputElement>('switch', {
      name: 'Remind me to practise',
    });
    expect(screen.getByLabelText<HTMLInputElement>('Time').disabled).toBe(true);

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle.checked).toBe(true));
    expect(fake.state.prompts).toBe(1);
    expect((await getDeviceSettings(db)).reminder).toEqual({ enabled: true, hour: 19, minute: 0 });

    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '07:45' } });
    await waitFor(async () =>
      expect((await getDeviceSettings(db)).reminder).toEqual({
        enabled: true,
        hour: 7,
        minute: 45,
      }),
    );
  });

  it('explains where to turn notifications on when they are blocked', async () => {
    const fake = fakeNotifier('prompt');
    fake.answerWith('denied');
    render(<ReminderSettings notifier={fake.notifier} db={db} available />);
    const toggle = await screen.findByRole<HTMLInputElement>('switch');
    await userEvent.click(toggle);
    expect((await screen.findByRole('status')).textContent).toMatch('Settings › Tjuvstart');
    expect(toggle.checked).toBe(false);
    expect((await getDeviceSettings(db)).reminder).toBeUndefined();
  });

  it('shows a reminder turned off in Settings as off', async () => {
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    const fake = fakeNotifier('denied');
    render(<ReminderSettings notifier={fake.notifier} db={db} available />);
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('switch').checked).toBe(false);
  });

  it('switches off without asking anything', async () => {
    await saveReminder({ enabled: true, hour: 19, minute: 0 }, db);
    const fake = fakeNotifier('granted');
    render(<ReminderSettings notifier={fake.notifier} db={db} available />);
    const toggle = await screen.findByRole<HTMLInputElement>('switch');
    await waitFor(() => expect(toggle.checked).toBe(true));
    await userEvent.click(toggle);
    await waitFor(async () => expect((await getDeviceSettings(db)).reminder?.enabled).toBe(false));
    expect(fake.state.prompts).toBe(0);
  });
});

describe('ReminderOffer', () => {
  const now = new Date(2026, 10, 26, 20, 10);

  it('suggests the time the learner just practised at and sets it on yes', async () => {
    const fake = fakeNotifier('prompt');
    render(<ReminderOffer notifier={fake.notifier} db={db} available now={now} />);
    await userEvent.click(await screen.findByRole('button', { name: /Remind me at 8:00\sPM/ }));
    expect((await screen.findByRole('status')).textContent).toMatch(/reminder at 8:00\sPM/);
    expect((await getDeviceSettings(db)).reminder).toEqual({ enabled: true, hour: 20, minute: 0 });
  });

  it('goes away for good on "Not now"', async () => {
    const fake = fakeNotifier('prompt');
    const { container } = render(
      <ReminderOffer notifier={fake.notifier} db={db} available now={now} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(container.innerHTML).toBe(''));
    expect(fake.state.prompts).toBe(0);
  });

  it('is not shown once answered', async () => {
    await saveReminder({ enabled: false, hour: 19, minute: 0 }, db);
    const { container } = render(
      <ReminderOffer notifier={fakeNotifier().notifier} db={db} available now={now} />,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container.innerHTML).toBe('');
  });
});
