/**
 * LECTURE SEULE — inspection audio_masters + Storage (aucune écriture Firestore/Storage).
 */
import { chromium } from '@playwright/test';

const URL = process.env.BASE_URL || 'http://localhost:5174';
const IDS = { 'Opanijé': '29dIDjgc2vPuDnwjiy9V', 'Vovó Falou': 'hJFMrFdzwLezPmeTgVpE' };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL);
await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

const out = await page.evaluate(async (ids) => {
  await window.signInWithEmailAndPassword(window.firebaseAuth, 'mestre@ogirador.com', 'playwrighttest');
  const db = window.firebaseDb;
  const res = { masters: [], masterIdsAll: [], masterError: null, storage: {}, storageErrors: [] };

  const summarize = (v, depth = 0) => {
    if (Array.isArray(v)) return `Array(${v.length})` + (v.length && typeof v[0] !== 'object' ? ` ex:${JSON.stringify(v.slice(0, 5))}` : '');
    if (v && typeof v === 'object') return depth > 0 ? `{${Object.keys(v).join(',')}}` : `{${Object.keys(v).slice(0, 12).join(',')}}`;
    return JSON.stringify(v)?.slice(0, 120);
  };

  try {
    const snap = await window.getDocs(window.collection(db, 'audio_masters'));
    res.masterIdsAll = snap.docs.map(d => d.id);
    for (const d of snap.docs) {
      const hit = Object.entries(ids).find(([, id]) => d.id.includes(id) || JSON.stringify(d.data()).includes(id));
      if (hit) {
        const data = d.data();
        const fields = {};
        for (const [k, v] of Object.entries(data)) fields[k] = summarize(v);
        res.masters.push({ docId: d.id, piece: hit[0], fields, raw: JSON.parse(JSON.stringify(data)) });
      }
    }
  } catch (e) { res.masterError = String(e.message || e); }

  const listRec = async (path, depth = 0) => {
    const items = [];
    try {
      const r = await window.storageListAll(window.storageRef(window.firebaseStorage, path));
      r.items.forEach(i => items.push(i.fullPath));
      if (depth < 4) for (const p of r.prefixes) items.push(...await listRec(p.fullPath, depth + 1));
    } catch (e) { res.storageErrors.push(`${path}: ${e.message || e}`); }
    return items;
  };
  for (const root of ['bounces/presets', 'documents/Samambaia/sequencer', 'documents/samambaia/sequencer']) {
    res.storage[root] = await listRec(root);
  }
  return res;
}, IDS);

import fs from 'fs';
fs.mkdirSync('scratch', { recursive: true });
fs.writeFileSync('scratch/audio-masters-dump.json', JSON.stringify({ ids: out.masterIdsAll, docs: out.masters.map(m => ({ docId: m.docId, piece: m.piece, raw: m.raw })) }, null, 1), 'utf-8');
console.log('\n=== audio_masters : documents (total) ===');
console.log(out.masterError ? `ERREUR: ${out.masterError}` : `${out.masterIdsAll.length} document(s): ${JSON.stringify(out.masterIdsAll)}`);
console.log('\n=== audio_masters : documents liés à Opanijé / Vovó Falou ===');
if (!out.masters.length) console.log('(aucun)');
out.masters.forEach(m => { console.log(`\n[${m.piece}] ${m.docId}`); console.table(m.fields); });

console.log('\n=== Storage ===');
for (const [root, files] of Object.entries(out.storage)) {
  console.log(`\n${root} : ${files.length} fichier(s)`);
  files.forEach(f => {
    const tag = Object.values(IDS).some(id => f.includes(id)) ? '  <== MATCH' : '';
    console.log(`  ${f}${tag}`);
  });
}
if (out.storageErrors.length) { console.log('\nErreurs Storage:'); out.storageErrors.forEach(e => console.log('  ' + e)); }
await browser.close();
