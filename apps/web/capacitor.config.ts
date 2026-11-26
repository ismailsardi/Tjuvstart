import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The iOS app wraps the same web build as the PWA (see docs/native.md). `pnpm cap:sync` builds
 * it with base path "/" and copies dist/ into the native project.
 */
const config: CapacitorConfig = {
  appId: 'com.ismailsardi.tjuvstart',
  appName: 'Tjuvstart',
  webDir: 'dist',
  ios: {
    // The page draws its own safe-area padding (env(safe-area-inset-*)).
    contentInset: 'never',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#1d4e89',
    },
  },
};

export default config;
