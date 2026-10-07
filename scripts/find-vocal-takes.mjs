/** LECTURE SEULE — liste Storage vocalRecordings/ et cherche les 7 patternIds d'Opanijé. */
import { chromium } from '@playwright/test';
const IDS = ['1790296486916','1790805834761','1790849655370','1790296487426','1790296844565','1790806197083','1790849481574'];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:5174');
await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });
const out = await page.evaluate(async (ids) => {
  await window.signInWithEmailAndPassword(window.firebaseAuth, 'mestre@ogirador.com', 'playwrighttest');
  const r = await window.storageListAll(window.storageRef(window.firebaseStorage, 'vocalRecordings'));
  const all = r.items.map(i => i.name);
  const res = { total: all.length, matches: {} };
  for (const id of ids) res.matches[id] = [];
  for (const n of all) for (const id of ids) if (n.startsWith(id)) {
    const item = r.items.find(i => i.name === n);
    res.matches[id].push({ name: n, url: await window.storageGetDownloadURL(item) });
  }
  return res;
}, IDS);
console.log('vocalRecordings/ total fichiers:', out.total);
for (const [id, m] of Object.entries(out.matches)) console.log(id, m.length ? m.map(x => x.name).join(', ') : '(aucun)');
console.log(JSON.stringify(out.matches));
await browser.close();
