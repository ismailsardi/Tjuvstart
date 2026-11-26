import { Capacitor } from '@capacitor/core';

/**
 * True inside the iOS (later Android) app, false in the browser and the installed PWA. Features
 * that need the device, such as local reminders, check this before loading their plugin.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
