import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Azeri-for-Dad is an offline-first PWA. The service worker precaches the app
// shell and (when present) the bundled Azerbaijani audio so the app works with
// no network after the first load — installable via "Add to Home Screen".
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': never reload the app mid-session — show an "Update ready"
      // banner and let the user apply it. (autoUpdate made every open feel
      // like a brand-new app after frequent deploys.)
      registerType: 'prompt',
      // audio/*.mp3 is already covered by globPatterns — listing it here too
      // used to double-count entries in the precache manifest.
      includeAssets: ['icons/*.png'],
      workbox: {
        // Audio files can be large in aggregate; allow generous precache size.
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json,mp3}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'azeri-audio',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: 'Azeri for Dad',
        short_name: 'Azeri',
        description: 'Learn Azerbaijani to talk with Dad — daily flashcards.',
        theme_color: '#0ea5a4',
        background_color: '#0b1020',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
