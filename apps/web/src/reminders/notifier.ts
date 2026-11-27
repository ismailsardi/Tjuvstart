import { REMINDER_IDS } from './plan';

export type NotificationPermission = 'granted' | 'denied' | 'prompt';

export interface ReminderNotification {
  id: number;
  at: Date;
  title: string;
  body: string;
  route: string;
}

/**
 * The device's notification centre, as far as reminders need it. The app uses the Capacitor
 * plugin; tests pass a fake.
 */
export interface ReminderNotifier {
  permission(): Promise<NotificationPermission>;
  /** Shows the system prompt if the learner hasn't answered it yet. */
  requestPermission(): Promise<NotificationPermission>;
  /** Replaces every pending reminder with these. An empty list cancels them all. */
  replace(notifications: readonly ReminderNotification[]): Promise<void>;
  /** Calls back with the route of a reminder the learner tapped, including one that opened the app. */
  onOpen(callback: (route: string) => void): () => void;
}

/** iOS shows "prompt-with-rationale" on Android only; for a reminder it means the same thing. */
function normalise(state: string): NotificationPermission {
  if (state === 'granted' || state === 'denied') return state;
  return 'prompt';
}

/**
 * The Capacitor implementation. The plugin is imported on first use, so the web build never
 * loads it.
 */
export function capacitorNotifier(): ReminderNotifier {
  const plugin = () =>
    import('@capacitor/local-notifications').then((module) => module.LocalNotifications);

  return {
    async permission() {
      return normalise((await (await plugin()).checkPermissions()).display);
    },
    async requestPermission() {
      return normalise((await (await plugin()).requestPermissions()).display);
    },
    async replace(notifications) {
      const notificationsPlugin = await plugin();
      const ours = new Set(REMINDER_IDS);
      const { notifications: pending } = await notificationsPlugin.getPending();
      const stale = pending.filter((n) => ours.has(n.id)).map((n) => ({ id: n.id }));
      if (stale.length > 0) await notificationsPlugin.cancel({ notifications: stale });
      if (notifications.length === 0) return;
      await notificationsPlugin.schedule({
        notifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          // A reminder doesn't need to arrive to the second, so Android never asks for the
          // exact-alarm permission for it.
          schedule: { at: n.at, allowWhileIdle: true },
          isExactNotification: false,
          extra: { route: n.route },
        })),
      });
    },
    onOpen(callback) {
      let removed = false;
      const handle = plugin().then((notificationsPlugin) =>
        notificationsPlugin.addListener('localNotificationActionPerformed', (action) => {
          const route: unknown = action.notification.extra?.route;
          if (!removed && typeof route === 'string') callback(route);
        }),
      );
      // Without the native plugin (a web view with no bridge) there is nothing to listen to.
      const ignore = () => undefined;
      handle.catch(ignore);
      return () => {
        removed = true;
        handle.then((listener) => listener.remove()).catch(ignore);
      };
    },
  };
}

/** The notifier the app uses. Creating it loads nothing; the plugin loads on the first call. */
export const deviceNotifier: ReminderNotifier = capacitorNotifier();
