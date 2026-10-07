/** LECTURE SEULE — durée des 7 prises vocales d'Opanijé (dernier upload de chaque patternId). */
import { chromium } from '@playwright/test';
const IDS = ['1790296486916','1790805834761','1790849655370','1790296487426','1790296844565','1790806197083','1790849481574'];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:5174');
await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });
const out = await page.evaluate(async (ids) => {
  await window.signInWithEmailAndPassword(window.firebaseAuth, 'mestre@ogirador.com', 'playwrighttest');
  const r = await window.storageListAll(window.storageRef(window.firebaseStorage, 'vocalRecordings'));
  const ctx = new AudioContext();
  const res = [];
  for (const id of ids) {
    const items = r.items.filter(i => i.name.startsWith(id + '_')).sort((a, b) => a.name.localeCompare(b.name));
    const latest = items[items.length - 1];
    const url = await window.storageGetDownloadURL(latest);
    const buf = await (await fetch(url)).arrayBuffer();
    const a = await ctx.decodeAudioData(buf);
    res.push({ id, file: latest.name, url, dur: +a.duration.toFixed(3), measures110: +(a.duration / (4 * 60 / 110)).toFixed(2) });
  }
  return res;
}, IDS);
console.table(out.map(({ url, ...x }) => x));
import fs from 'fs';
fs.writeFileSync('scratch/opanije-vocal-takes.json', JSON.stringify(out, null, 1));
await browser.close();
