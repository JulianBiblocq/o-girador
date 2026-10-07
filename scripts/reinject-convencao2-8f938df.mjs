/** Réinjection 1:1 de Convenção 2 depuis recup_8f938df/_convencao_2.json (aucune altération musicale). */
import { chromium } from '@playwright/test';
import fs from 'fs';
import crypto from 'crypto';
import LZString from 'lz-string';

const UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
const ID = 'nawSahyNqRJK09bwmbHu';
const raw = fs.readFileSync('recup_8f938df/_convencao_2.json', 'utf8').replace(/^\uFEFF/, '');
const preset = JSON.parse(raw);
const canon = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const srcHash = canon(preset);
const compressed = LZString.compressToBase64(JSON.stringify(preset));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:5174');
await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });
const res = await page.evaluate(async ({ id, compressed, uid }) => {
  window.__ALLOW_SANCTUARIZED_RESTORE__ = true;
  await window.signInWithEmailAndPassword(window.firebaseAuth, 'mestre@ogirador.com', 'playwrighttest');
  const ref = window.doc(window.firebaseDb, 'presets', id);
  await window.setDoc(ref, { name: 'Convenção 2', data: compressed, ownerId: uid, groupId: 'samambaia', mestreId: uid,
    visibility: 'mestre_group', isDraft: false, isLocked: true, updatedAt: Date.now() }, { merge: true });
  return (await window.getDoc(ref)).data();
}, { id: ID, compressed, uid: UID });
await browser.close();

const back = JSON.parse(LZString.decompressFromBase64(res.data));
const flat = (a) => (a || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
console.log('Identique octet-à-octet (hash JSON) au fichier 8f938df :', canon(back) === srcHash ? 'OUI' : 'NON');
console.table([{ ID, name: res.name, totalMeasures: back.totalMeasures, bpm: back.bpm, pistes: back.tracks.length,
  'pas actifs': back.tracks.reduce((s, t) => s + (t.patterns || []).reduce((a, p) => a + flat(p.activeSteps), 0), 0),
  signaux: (back.measureSignals || []).filter(Boolean).length, groupId: res.groupId, mestreId: res.mestreId, ownerId: res.ownerId, visibility: res.visibility, isDraft: res.isDraft, isLocked: res.isLocked }]);
