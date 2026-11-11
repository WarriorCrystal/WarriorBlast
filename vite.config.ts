/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// BASE: '/' en Netlify/Cloudflare; '/NOMBRE-REPO/' en GitHub Pages (lo pone el workflow).
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Warrior Blast',
        short_name: 'Warrior Blast',
        description: 'Puzzle de bloques: encaja, limpia y encadena combos.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#07051a',
        theme_color: '#07051a',
        categories: ['games', 'puzzle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precachear absolutamente todo lo que genera el build
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
