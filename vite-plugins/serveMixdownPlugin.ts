import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';

export function serveMixdownPlugin(rootDir: string): Plugin {
  return {
    name: 'serve-mixdown-audio',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url) {
          const decodedUrl = decodeURIComponent(req.url);
          if (decodedUrl.includes('/Mixdown/') || decodedUrl.includes('/mixdown/')) {
            if (decodedUrl.includes('\0')) {
              res.statusCode = 400;
              res.end('400 Bad Request: Null byte detected');
              return;
            }
            const mixdownBaseDir = process.env.VITE_MIXDOWN_PATH || path.resolve(rootDir, 'public', 'Mixdown');
            const relativePath = decodedUrl.includes('/Mixdown/')
              ? decodedUrl.split('/Mixdown/')[1].split('?')[0]
              : decodedUrl.split('/mixdown/')[1].split('?')[0];
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
            if (/\.(ogg|wav|mp3)$/i.test(decodedUrl)) {
              res.statusCode = 404;
              res.end('404 Not Found: Audio file missing');
              return;
            }
          }
        }
        next();
      });
    },
  };
}

