import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { percussionWorkletPlugin } from './vite-plugins/percussionWorkletPlugin.ts';
import { serveMixdownPlugin } from './vite-plugins/serveMixdownPlugin.ts';

// Stratégie de mise en cache à la volée (Runtime Caching) pour la PWA
const pwaRuntimeCaching = [
  {
    urlPattern: /\.(?:mp3|ogg|wav|m4a)$/i,
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'audio-samples-cache',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'firebase-storage-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
];

export default defineConfig(({ command }) => {
  return {
    base: '/',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
            if (id.includes('node_modules/tone')) return 'tone';
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
            if (id.includes('node_modules/@dnd-kit')) return 'dnd-kit';
          },
        },
      },
    },
    esbuild: {
      drop: command === 'build' ? ['console', 'debugger'] : [],
    },
    plugins: [
      percussionWorkletPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        injectRegister: false,
        manifest: {
          name: 'O Girador - Sequenciador de Maracatu de Baque Virado',
          short_name: 'O Girador',
          description: 'Sequenciador interativo de ritmos de Maracatu de Baque Virado. Crie, visualize e escute padrões rítmicos.',
          theme_color: '#0a0807',
          background_color: '#0a0807',
          display: 'standalone',
          orientation: 'any',
          launch_handler: { client_mode: 'focus-existing' },
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json,woff2,otf}'],
          globIgnores: ['**/version.json'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: pwaRuntimeCaching,
          navigateFallbackDenylist: [/^\/tutorial\.html$/],
        },
      }),
      serveMixdownPlugin(import.meta.dirname),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
