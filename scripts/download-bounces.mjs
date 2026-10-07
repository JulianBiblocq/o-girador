/**
 * Télécharge les bounces WebM depuis Firebase Storage (lecture seule) vers scratch/.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';

const URL = process.env.BASE_URL || 'http://localhost:5174';
const FILES = ['hJFMrFdzwLezPmeTgVpE', ' 29dIDjgc2vPuDnwjiy9V'.trim()];
fs.mkdirSync('scratch', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL);
await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });
const urls = await page.evaluate(async (ids) => {
  await window.signInWithEmailAndPassword(window.firebaseAuth, 'mestre@ogirador.com', 'playwrighttest');
  const out = {};
  for (const id of ids) out[id] = await window.storageGetDownloadURL(window.storageRef(window.firebaseStorage, `bounces/presets/${id}.webm`));
  return out;
}, FILES);
await browser.close();

for (const id of FILES) {
  const res = await fetch(urls[id]);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`scratch/${id}.webm`, buf);
  console.log(`✓ scratch/${id}.webm  ${(buf.length / 1024).toFixed(1)} KB (HTTP ${res.status})`);
}
