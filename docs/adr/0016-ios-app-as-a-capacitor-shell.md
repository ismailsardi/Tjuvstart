# 0016. The iOS app is the web app in a Capacitor shell, with reminders on the device

- Status: Accepted
- Date: 2026-11-26

## Context

Tjuvstart is a PWA, and on iPhone a PWA is a second-class citizen: it has to be added to the home screen by hand, nobody finds it in the App Store, and web push only works after that manual install. The learners we build for (adults who just moved to Norway for work) look for apps in the App Store. A daily reminder is also one of the few things that reliably brings people back to a language app, and it has to arrive whether or not the app is open.

Constraints from earlier decisions:

- One small team and zero running cost ([ADR 0002](0002-local-first-zero-cost.md)). A second UI codebase in Swift, or a rewrite in React Native, would double the work for every lesson type and screen.
- Progress is local first (IndexedDB through Dexie), with optional sync ([ADR 0011](0011-sync-api-design.md)).
- Motivation without guilt ([ADR 0012](0012-motivation-without-points.md)): a reminder must be a nudge the learner asked for, never a stream of "you're about to lose your streak".

## Decision

- **Wrap the existing web build with [Capacitor](https://capacitorjs.com/) 8.** The iOS project lives in `apps/web/ios` and is committed. Plugins come in through Swift Package Manager, so there is no CocoaPods step. `pnpm --filter @tjuvstart/web ios:sync` builds the web app and copies it in. Android can be added the same way later.
- **Native code is opt-in at runtime.** `isNativeApp()` (`src/native/platform.ts`) decides; plugin code is imported dynamically, so the web build does not download it. Inside the app there is no service worker and no "new version" banner, since updates come through the App Store.
- **Daily reminders are local notifications** scheduled on the device from the time the learner picks. No server, no push certificates, no cost. The details are in [docs/native.md](../native.md#daily-reminders); the rules that matter:
  - Off until the learner turns it on. The system permission prompt only ever follows their own tap: once on Today, the first time they meet their daily goal, and in the daily goal settings.
  - A rolling window of seven days, scheduled again on every visit. A day whose streak is already earned gets no reminder. If the learner stops opening the app, the seventh reminder says it is the last one, and then they stop.
  - Only today's reminder states the streak number, because it is the only one we know to be true when it fires.
  - The reminder time is a per-device setting, kept out of sync: a 07:30 nudge on the phone should not follow the learner to their laptop.
- **Account sign-in is hidden in the app for now.** Google's web sign-in does not run inside an iOS web view, and the App Store requires Sign in with Apple next to any other third-party login. Both arrive together as native sign-in before the first store release.

## Consequences

- Every lesson, the engine, the content and the data layer are shared as they are. The native project is Capacitor's template with its own icon and launch screen and a few `Info.plist` settings changed.
- The app feels like a web view in places (scrolling, text selection, transitions). Haptics and careful touch targets close most of the gap; [docs/native.md](../native.md#later) lists them.
- iOS may clear a web view's IndexedDB when the device runs very low on storage. Sync covers learners who sign in; moving progress to native SQLite is the fallback if this turns out to happen in practice.
- iOS builds need a Mac with Xcode. CI compiles the native project on a macOS runner, unsigned, whenever it or its plugins change; signing and uploads happen on a Mac.
