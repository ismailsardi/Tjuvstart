/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/, so CI sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

/**
 * The learner's API key lives in the browser, so the page only talks to itself and to the
 * Anthropic API. If a script were ever injected, it could not send the key anywhere else.
 * Added to the built page only: the dev server relies on inline scripts for hot reload.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  // Learners' own recordings play from blob: URLs.
  "media-src 'self' blob:",
  "connect-src 'self' https://api.anthropic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  base,
  // Lessons live in /content at the repository root and are imported at build time.
  server: { fs: { allow: ['../..'] } },
  plugins: [
    contentSecurityPolicy(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      workbox: {
        // Audio is fetched the first time a sentence is played and then kept for offline use,
        // so installing the app does not download every recording up front.
        // The AI SDK is only useful online, so it is fetched on first use instead of at install.
        globIgnores: ['audio/**', 'assets/sdk-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio',
              expiration: { maxEntries: 2000 },
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // File names change with the voice, so a stale list would point to missing files.
            urlPattern: ({ url }) => url.pathname.endsWith('/audio/index.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'audio-index', networkTimeoutSeconds: 3 },
          },
        ],
      },
      manifest: {
        name: 'Tjuvstart',
        short_name: 'Tjuvstart',
        description: 'Learn Norwegian (bokmål) from A1 to B2, adapted to your level.',
        lang: 'nb',
        theme_color: '#1d4e89',
        background_color: '#f4f6fa',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
