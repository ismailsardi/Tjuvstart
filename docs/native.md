# Native apps

The iOS app is the same React app as the PWA, wrapped with Capacitor ([ADR 0016](adr/0016-ios-app-as-a-capacitor-shell.md)). This page covers how it fits together, how daily reminders work, how to build and run it on a Mac, and the native features planned next.

## How it fits together

```
apps/web/
  src/                    the app, shared by the PWA and the iOS app
  src/native/platform.ts  isNativeApp(): true inside the iOS app
  src/reminders/          daily reminders (iOS only)
  capacitor.config.ts     app id, name and native settings
  ios/App/                the Xcode project (committed)
  scripts/ios-assets.mjs  renders the app icon and launch screen from the brand mark
```

`pnpm --filter @tjuvstart/web ios:sync` builds the web app with base path `/` and copies `dist/` into `ios/App/App/public`. That copy is generated and not committed. Plugins are linked through Swift Package Manager (`ios/App/CapApp-SPM/Package.swift`, rewritten by `cap sync`).

Inside the app, a few things differ from the browser:

| Area            | In the iOS app                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Updates         | No service worker and no "new version" banner. A new web build ships with a new App Store version.                                                                                               |
| Layout          | The page runs edge to edge (`viewport-fit=cover`) and pads itself with `env(safe-area-inset-*)`, so nothing sits under the notch, the status bar or the home indicator. iPhone is portrait only. |
| Audio           | Whatever is in `public/audio` when `ios:sync` runs is bundled, so every recording plays offline from the first launch. Generate the audio first (see `tools/audio`) for a release build.         |
| Account sync    | Hidden until native sign-in lands (see [Sign in with Apple](#sign-in-with-apple-and-native-google-sign-in)).                                                                                     |
| Daily reminders | Available, see below.                                                                                                                                                                            |

## Daily reminders

Reminders are local notifications, scheduled on the device by `@capacitor/local-notifications`. There is no server and no push certificate.

**Turning them on.** The learner is asked at two moments, both on their own tap:

- the first time they meet their daily goal in the app, Today shows a one-line offer to be reminded at about the time they just practised (rounded to the half hour, kept between 07:00 and 21:30);
- under Daily goal (from Today or Me) there is a switch and a time picker, with 19:00 as the default.

The system permission prompt only appears after one of those taps. If notifications are blocked, the switch stays off and the page says where to turn them on in Settings. The app checks again every time it comes back to the foreground.

**What gets scheduled.** `planReminders` (`src/reminders/plan.ts`) builds a rolling window of seven days at the chosen local time, and `ReminderScheduler` replaces the pending reminders with it whenever something changes: the setting, today's progress, the troll's name, the interface language, the date. In practice that is every time the learner opens the app or answers a question.

- Today is skipped once the day counts for the streak, or when the time has passed.
- Today's reminder names the streak ("Your 5-day streak is waiting"), or says yesterday was missed and today keeps it. Day one gets its own line.
- Tomorrow's reminder says "keep your streak going" without a number, since the count depends on what happens before then. Later days rotate through three gentle lines.
- The seventh day says it is the last reminder for now. If the learner doesn't come back, the reminders stop there.
- Each reminder comes from the troll (the title is its name), is written in the interface language, and opens straight into today's session (`#/daily`).
- Reminders use fixed ids (1001 to 1007), so scheduling again replaces them and other notifications can use other ids later.

The reminder time is stored in the local `device` table, not on the synced profile.

## Building and running on a Mac

You need a Mac with Xcode 16 or newer from the App Store, plus Node 22 and pnpm as for the web app.

1. Install and build:

   ```bash
   pnpm install
   pnpm --filter @tjuvstart/web ios:sync
   pnpm --filter @tjuvstart/web ios:open    # opens ios/App/App.xcodeproj in Xcode
   ```

2. In Xcode, pick an iPhone simulator and press Run. The first build downloads the Capacitor Swift packages, which takes a minute.
3. To run on your own iPhone, select the App target, open **Signing & Capabilities**, tick **Automatically manage signing** and choose your team. A free Apple ID works for your own device; TestFlight and the App Store need a membership in the Apple Developer Program.
4. After any change to the web code, run `ios:sync` again and press Run. Changes to `capacitor.config.ts` or to plugins also need `ios:sync`.

To try a reminder quickly: open Today, finish enough of the daily session to meet the goal, accept the offer, then set the time two minutes ahead under Daily goal and lock the phone. The simulator shows local notifications too.

Before the first App Store upload:

- **Bundle id.** It is `com.ismailsardi.tjuvstart` in `capacitor.config.ts` and the Xcode project. It cannot change once the app is in App Store Connect.
- **Version.** `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in the Xcode project. Raise the build number for every upload.
- **Audio.** Generate it before `ios:sync`, so the release bundles it.
- **Privacy.** The app answers "no" to non-exempt encryption (`ITSAppUsesNonExemptEncryption` in `Info.plist`), since it only uses HTTPS. The App Store privacy labels follow from the [privacy section of the spec](spec.md#14-privacy-and-security): no tracking, and progress stays on the device unless the learner signs in.

CI builds the project for the simulator, unsigned, on a macOS runner whenever the native project, the Capacitor config or the dependencies change (`.github/workflows/ios.yml`). It also fails if `cap sync` would change a committed native file, which catches a plugin added to `package.json` without syncing.

## Later

In the order they are likely to land.

### Sign in with Apple and native Google sign-in

Needed before the first store release: Apple's guideline 4.8 requires Sign in with Apple in any app that offers another third-party login, and Google's web sign-in button does not run inside a web view.

- **App:** a native sign-in plugin returns an ID token from Apple's and Google's iOS SDKs. The app sends it to `POST /v1/auth/sign-in` exactly as the web app sends Google's token today.
- **Sync API:** Apple is an OpenID Connect provider, so accepting its tokens is configuration: an `apple` entry under `Auth:Providers` with authority `https://appleid.apple.com` and the bundle id as client id, and the iOS client id added to Google's `ClientIds`. Apple also requires the API to revoke the learner's Apple token when they delete their account, which needs a key from the Apple developer account to sign the revocation request.
- **CORS:** add `capacitor://localhost` (the app's origin) to `WebClient:AllowedOrigins`.

### In-app purchases

Through RevenueCat's Capacitor SDK, which wraps StoreKit 2 and also covers Google Play later. Purchases are tied to the RevenueCat customer, which links to the sync account once the learner signs in. Products and prices are configured in App Store Connect and RevenueCat, not in code.

### Haptics

`@capacitor/haptics`: a light tap on a correct answer, a soft double tap on a wrong one, a success pattern when the daily goal ring closes. iOS already mutes them when the learner turns system haptics off.

### Offline audio, smaller download

Bundling every recording (see the table above) makes the first install heavier. If the size matters, ship the A1 audio in the bundle and download the rest into the app's container on first use.

### Server push (APNs)

Only for messages that can't be scheduled ahead on the device, such as something another learner did. It needs an APNs key, a device token table in the sync API and a small sender. Local reminders stay local.

### Tusse on the home screen

A WidgetKit widget showing the troll, today's goal ring and the streak. Widgets are native SwiftUI and can't read the web view's IndexedDB, so the app writes a small snapshot (streak, today's count, goal, outfit) to a shared App Group container whenever progress changes, and the widget reads it.
