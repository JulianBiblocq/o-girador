import { chromium } from '@playwright/test';

const DEV_SERVER_URL = process.env.BASE_URL || 'http://localhost:5174';

async function main() {
  console.log(`Connecting to ${DEV_SERVER_URL}...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(DEV_SERVER_URL);
    await page.waitForFunction(() => 'firebaseStorage' in window && 'storageRef' in window, { timeout: 30000 });

    const results = await page.evaluate(async () => {
      const auth = window.firebaseAuth;
      const signIn = window.signInWithEmailAndPassword;
      await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

      const storage = window.firebaseStorage;
      const ref = window.storageRef;
      const listAll = window.storageListAll;
      const getDownloadURL = window.storageGetDownloadURL;

      async function scanFolder(folderPath, maxDepth = 3) {
        if (maxDepth <= 0) return { path: folderPath, note: 'max depth' };
        try {
          const r = ref(storage, folderPath);
          const res = await listAll(r);
          const subfolders = [];
          for (const prefix of res.prefixes) {
            const sub = await scanFolder(prefix.fullPath, maxDepth - 1);
            subfolders.push(sub);
          }
          const files = [];
          for (const item of res.items) {
            let url = null;
            try { url = await getDownloadURL(item); } catch (_) {}
            files.push({ name: item.name, fullPath: item.fullPath, url });
          }
          return {
            path: folderPath,
            filesCount: files.length,
            files,
            subfolders
          };
        } catch (e) {
          return { path: folderPath, error: e.message };
        }
      }

      const paths = [
        'documents/Samambaia/sequencer',
        'documents/samambaia/sequencer',
        'documents/Samambaia',
        'documents',
        'presets',
        'bounces'
      ];

      const out = {};
      for (const p of paths) {
        out[p] = await scanFolder(p, 2);
      }
      return out;
    });

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Error during storage scan:', err);
  } finally {
    await browser.close();
  }
}

main();
