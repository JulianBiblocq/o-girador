import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? '/o-girador/' : '/',
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,wav,mp3,ogg,json,woff2,otf}'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB
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
                let filePath = '';
                
                if (decodedUrl.startsWith('/E:/') || decodedUrl.startsWith('/e:/')) {
                  filePath = decodedUrl.substring(1);
                } else if (decodedUrl.includes('Mixdown/')) {
                  const mixdownIdx = decodedUrl.indexOf('Mixdown/');
                  filePath = path.join('E:/projets/Roda de maracatu', decodedUrl.substring(mixdownIdx));
                } else if (decodedUrl.includes('mixdown/')) {
                  const mixdownIdx = decodedUrl.indexOf('mixdown/');
                  filePath = path.join('E:/projets/Roda de maracatu/Mixdown', decodedUrl.substring(mixdownIdx + 'mixdown/'.length));
                }
                
                // Let's check absolute path
                if (filePath && fs.existsSync(filePath)) {
                  res.setHeader('Content-Type', 'audio/ogg');
                  fs.createReadStream(filePath).pipe(res);
                  return;
                }
                
                // Fallback: search in sibling Mixdown directory relative to project root
                const relativeMixdown = path.resolve(__dirname, '..', 'Mixdown');
                const filename = path.basename(decodedUrl);
                const fallbackPath = path.join(relativeMixdown, filename);
                if (fs.existsSync(fallbackPath)) {
                  res.setHeader('Content-Type', 'audio/ogg');
                  fs.createReadStream(fallbackPath).pipe(res);
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
