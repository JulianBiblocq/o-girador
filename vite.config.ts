import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Stratégie de mise en cache à la volée (Runtime Caching) pour la PWA
const pwaRuntimeCaching = [
  // Cache des samples audio locaux (chargés à la volée et disponibles hors-ligne)
  {
    urlPattern: /\.(?:mp3|ogg|wav|m4a)$/i,
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'audio-samples-cache',
      expiration: {
        maxEntries: 200, // Sécurité mémoire pour ne pas saturer le disque
        maxAgeSeconds: 30 * 24 * 60 * 60, // Conservation maximale de 30 jours
      },
      cacheableResponse: {
        statuses: [0, 200], // Accepte les requêtes standard et opaques
      },
    },
  },
  // Cache existant pour les fichiers Firebase Storage
  {
    urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'firebase-storage-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
      cacheableResponse: {
        statuses: [0, 200]
      }
    }
  }
];


export default defineConfig(({ command, mode }) => {
  const isPreview = mode === 'production' && command === 'serve';
  return {
    base: command === 'build' || isPreview ? '/o-girador/' : '/',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 🛡️ FIX (Audit): Isolate all firebase packages to fix chunking issues
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase';
            }
            if (id.includes('node_modules/tone')) {
              return 'tone';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react';
            }
            if (id.includes('node_modules/@dnd-kit')) {
              return 'dnd-kit';
            }
          }
        }
      }
    },
    esbuild: {
      drop: command === 'build' ? ['console', 'debugger'] : [],
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        injectRegister: false,
        manifest: {
          name: "O Girador - Sequenciador de Maracatu de Baque Virado",
          short_name: "O Girador",
          description: "Sequenciador interativo de ritmos de Maracatu de Baque Virado. Crie, visualize e escute padrões rítmicos.",
          theme_color: "#0a0807",
          background_color: "#0a0807",
          display: "standalone",
          orientation: "any",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json,woff2,otf}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          runtimeCaching: pwaRuntimeCaching
        }
      }),

      {
        name: 'serve-mixdown-audio',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url) {
              const decodedUrl = decodeURIComponent(req.url);
              
              // Check if URL matches the Mixdown folder path or files
              if (decodedUrl.includes('/Mixdown/') || decodedUrl.includes('/mixdown/')) {
                if (decodedUrl.includes('\0')) {
                  res.statusCode = 400;
                  res.end('400 Bad Request: Null byte detected');
                  return;
                }

                const mixdownBaseDir = process.env.VITE_MIXDOWN_PATH || path.resolve(__dirname, 'public', 'Mixdown');
                
                // Extract relative path after Mixdown/ to support subdirectories
                let relativePath = '';
                if (decodedUrl.includes('/Mixdown/')) {
                  relativePath = decodedUrl.split('/Mixdown/')[1].split('?')[0];
                } else {
                  relativePath = decodedUrl.split('/mixdown/')[1].split('?')[0];
                }
                
                const rawPath = path.join(mixdownBaseDir, relativePath);
                
                try {
                  if (fs.existsSync(rawPath) && fs.existsSync(mixdownBaseDir)) {
                    const realPath = fs.realpathSync(rawPath);
                    const realBase = fs.realpathSync(mixdownBaseDir);
                    const baseWithTrailing = realBase.endsWith(path.sep) ? realBase : realBase + path.sep;
                    
                    if (!realPath.startsWith(baseWithTrailing)) {
                      res.statusCode = 403;
                      res.end('403 Forbidden: Path traversal attempt detected');
                      return;
                    }
                    
                    if (fs.statSync(realPath).isFile()) {
                      res.setHeader('Content-Type', 'audio/ogg');
                      const stream = fs.createReadStream(realPath);
                      stream.on('error', (err) => {
                        console.error('Stream error:', err);
                        if (!res.headersSent) {
                          res.statusCode = 500;
                          res.end('500 Internal Server Error');
                        }
                      });
                      stream.pipe(res);
                      return;
                    }
                  }
                } catch (err) {
                  console.error('Error reading mixdown file:', err);
                }

                // 🛡️ FIX (Audit): Force 404 on missing audio files to prevent SPA fallback
                if (/\.(ogg|wav|mp3)$/i.test(decodedUrl)) {
                  res.statusCode = 404;
                  res.end('404 Not Found: Audio file missing');
                  return;
                }
              }
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
