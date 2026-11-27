import type { NotificationPermission, ReminderNotification, ReminderNotifier } from './notifier';

/** An in-memory notification centre for tests. */
export function fakeNotifier(initial: NotificationPermission = 'prompt') {
  let permission = initial;
  let answer: NotificationPermission = 'granted';
  const listeners = new Set<(route: string) => void>();
  const state = {
    pending: [] as ReminderNotification[],
    prompts: 0,
    replaced: 0,
  };
  const notifier: ReminderNotifier = {
    permission: () => Promise.resolve(permission),
    requestPermission() {
      if (permission === 'prompt') {
        state.prompts += 1;
        permission = answer;
      }
      return Promise.resolve(permission);
    },
    replace(notifications) {
      state.replaced += 1;
      state.pending = [...notifications];
      return Promise.resolve();
    },
    onOpen(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
  return {
    notifier,
    state,
    /** What the learner will answer when the system prompt appears. */
    answerWith(next: NotificationPermission) {
      answer = next;
    },
    /** The learner changes the permission in Settings. */
    setPermission(next: NotificationPermission) {
      permission = next;
    },
    /** The learner taps a delivered reminder. */
    tap(route: string) {
      for (const listener of listeners) listener(route);
    },
  };
}
