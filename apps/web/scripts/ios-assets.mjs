// Renders the iOS app icon and launch screen from the brand mark (public/icon.svg's design).
// Run from apps/web after changing the mark: node scripts/ios-assets.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../ios/App/App/Assets.xcassets/', import.meta.url));

// The mark from public/icon.svg, without its rounded corners: iOS masks the icon itself.
const mark = (size, { rounded }) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
    <rect width="1024" height="1024" ${rounded ? 'rx="228"' : ''} fill="#0f2440"/>
    <circle cx="512" cy="558" r="232" fill="none" stroke="#e9eef5" stroke-width="88"/>
    <line x1="371" y1="784" x2="714" y2="234" stroke-linecap="round" stroke="#0f2440" stroke-width="132"/>
    <line x1="371" y1="784" x2="714" y2="234" stroke-linecap="round" stroke="#e4572e" stroke-width="88"/>
  </svg>`;

// The launch screen is a 2732 px square drawn with "aspect fill", so on a phone the mark shows at
// about 96 pt. The backgrounds match the app's light and dark --bg, so the first screen follows
// on without a flash.
const splash = (background) => `
  <div style="width:2732px;height:2732px;display:grid;place-items:center;background:${background}">
    ${mark(310, { rounded: true })}
  </div>`;

const files = [
  { path: 'AppIcon.appiconset/AppIcon-1024.png', size: 1024, html: mark(1024, { rounded: false }) },
  { path: 'Splash.imageset/splash-light.png', size: 2732, html: splash('#f4f6fa') },
  { path: 'Splash.imageset/splash-dark.png', size: 2732, html: splash('#0e1420') },
];

// CHROMIUM_PATH points at an installed Chromium when Playwright's own download is missing.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
for (const file of files) {
  await page.setViewportSize({ width: file.size, height: file.size });
  await page.setContent(`<body style="margin:0">${file.html}</body>`);
  // An opaque page gives an opaque PNG: the App Store rejects icons with an alpha channel.
  await page.screenshot({ path: assets + file.path });
}
await browser.close();
