/**
 * Rétablissement des voix d'Opanijé (vraies pistes/patterns/prises) et déploiement de Vovó Falou (33 mes. / 86 BPM).
 * Écrit dans Firestore presets/29dIDjgc2vPuDnwjiy9V et presets/hJFMrFdzwLezPmeTgVpE uniquement.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import LZString from 'lz-string';

const URL = process.env.BASE_URL || 'http://localhost:5174';
const UID = 'iA0SweEHyOPzAPGIDVZdeKAV2mk1';
const OPANIJE_ID = '29dIDjgc2vPuDnwjiy9V';
const VOVO_ID = 'hJFMrFdzwLezPmeTgVpE';
const BUS_ID = '999901';
const PUX_ID = 1790296487626;
const CORO_ID = 1790296487625;

const flat = (v) => (v || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
const assign = (n, idxs) => { const a = Array(n).fill(false); idxs.forEach(i => { a[i] = true; }); return a; };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// =====================================================================
// 1. OPANIJÉ
// =====================================================================
const N_OP = 43;
const opanije = JSON.parse(fs.readFileSync('recup-opanije-43mesures.json', 'utf-8'));
const takes = Object.fromEntries(JSON.parse(fs.readFileSync('scratch/opanije-vocal-takes.json', 'utf-8')).map(t => [t.id, t]));

const mkVocalPattern = (id, name, role) => {
  const t = takes[String(id)];
  if (!t) throw new Error(`Prise vocale introuvable pour le pattern ${id}`);
  return {
    id,
    name,
    steps: 16,
    activeSteps: Array(16).fill(0),
    lyrics: Array(16).fill(''),
    notes: Array(16).fill(''),
    measureAssignments: Array(N_OP).fill(false), // rempli plus bas
    volumes: Array(16).fill(80),
    decays: Array(16).fill(100),
    microtimings: Array(16).fill(0),
    variations: [],
    vocalMode: 'micro',
    vocalAudioUrl: t.url,
    vocalBaseBpm: 110,
    vocalBpmSync: true,
    vocalClip: {
      id,
      name: `${role} ${id}`,
      patternId: id,
      sampleBpm: 110,
      baseBpm: 110,
      trimStartSec: 0,
      trimEndSec: t.dur,
      nudgeMs: 0,
      anacrusisBeats: 0
    }
  };
};

// Patterns réels (3 Puxador / 4 Coro) — indexés dans IndexedDB vocalRecordings par patternId
const P = {
  appel: mkVocalPattern(1790296486916, 'Thème Opanijé (appel)', 'Puxador'),
  couplet: mkVocalPattern(1790805834761, 'Couplet Puxador', 'Puxador'),
  relance: mkVocalPattern(1790849655370, 'Relance Puxador', 'Puxador')
};
const C = {
  r1: mkVocalPattern(1790296487426, 'Réponse Chœur 1', 'Coro'),
  r2: mkVocalPattern(1790296844565, 'Réponse Chœur 2', 'Coro'),
  r3: mkVocalPattern(1790806197083, 'Réponse Chœur 3', 'Coro'),
  r4: mkVocalPattern(1790849481574, 'Réponse Chœur 4', 'Coro')
};

// Timeline (index de mesure 0-based) : 0-10 silence, 11 appel, 12-33 cycles de 4 (Puxador c, Coro c+2), 34-42 virada Luanda (sans voix)
const puxRot = [P.couplet, P.relance, P.couplet, P.relance, P.couplet, P.relance];
const coroRot = [C.r1, C.r2, C.r3, C.r4, C.r1];
const plan = { puxador: [[11, P.appel]], coro: [] };
[12, 16, 20, 24, 28, 32].forEach((c, i) => {
  plan.puxador.push([c, puxRot[i]]);
  if (c + 2 <= 33) plan.coro.push([c + 2, coroRot[i]]);
});
plan.puxador.forEach(([m, p]) => { p.measureAssignments[m] = true; });
plan.coro.forEach(([m, p]) => { p.measureAssignments[m] = true; });

const oldPux = opanije.tracks.find(t => String(t.id) === '999101');
const oldCoro = opanije.tracks.find(t => String(t.id) === '999102');
if (!oldPux || !oldCoro) throw new Error('Pistes 999101/999102 introuvables dans la source');

const newPux = {
  ...oldPux, id: PUX_ID, name: 'Puxador', customName: 'Puxador', instrumentIdx: 10,
  instrumentRoleKey: 'puxador', busId: BUS_ID,
  patterns: Object.values(P), selectedPatternId: P.appel.id
};
const newCoro = {
  ...oldCoro, id: CORO_ID, name: 'Coro', customName: 'Coro', instrumentIdx: 11,
  instrumentRoleKey: 'coro', busId: BUS_ID,
  patterns: Object.values(C), selectedPatternId: C.r1.id
};

let opJson = JSON.stringify({
  ...opanije,
  name: 'Opanijé',
  totalMeasures: N_OP,
  tracks: opanije.tracks.map(t => String(t.id) === '999101' ? newPux : String(t.id) === '999102' ? newCoro : t)
});
// Références résiduelles aux anciens ids (ex: rodaTrackOrder)
opJson = opJson.replace(/(?<![\d])999101(?![\d])/g, String(PUX_ID)).replace(/(?<![\d])999102(?![\d])/g, String(CORO_ID));
const opPreset = JSON.parse(opJson);
if (/(?<![\d])99910[12](?![\d])/.test(JSON.stringify(opPreset))) throw new Error('Anciens ids 999101/999102 encore présents');
if (JSON.stringify(opPreset).includes('"id":9101') || JSON.stringify(opPreset).includes('"id":9102')) throw new Error('Anciens patterns 9101/9102 encore présents');

// =====================================================================
// 2. VOVÓ FALOU — 33 mesures / 86 BPM
// =====================================================================
const N_V = 33;
const { tracks: _t, metadata: _m, measureSignals: _s, letras: _l, songMarkers: _sm, songSections: _ss, ...tpl } = opanije;
const cycles = range(0, 7).map(k => 1 + 4 * k); // débuts de cycle : 1,5,...,29
const cyc = (off) => cycles.map(c => c + off);
const basePat = (id, name, steps, extra = {}) => ({
  id, name, steps: 16, activeSteps: steps,
  lyrics: Array(16).fill(''), notes: Array(16).fill(''),
  measureAssignments: Array(N_V).fill(false),
  volumes: Array(16).fill(80), decays: Array(16).fill(100), microtimings: Array(16).fill(0), variations: [], ...extra
});
const mkTrack = (id, name, idx, role, patterns, extra = {}) => ({
  id, name, customName: name, instrumentIdx: idx, instrumentRoleKey: role,
  volumeVal: 80, isMute: false, isSolo: false, isHidden: false,
  selectedPatternId: patterns[0]?.id ?? 0, patterns, ...extra
});

const marcante = basePat(1779908305252, 'Padrão 1', ['D', 0, 0, 0, 'g', 0, 'D', 0, 'g', 'D', 0, 0, 'g', 'D', 0, 0]);
marcante.measureAssignments = assign(N_V, range(1, 32));
const caixa = basePat(1779908307194, 'Padrão 1', ['D', 'D', 'g', 'D', 'D', 'g', 'D', 'g', 'D', 'D', 'g', 'D', 'D', 'g', 'D', 'g']);
caixa.measureAssignments = assign(N_V, range(1, 32));
const gongue = basePat(1779908312248, 'Padrão 1', ['GRV', 0, 'AIG', 0, 'GRV', 0, 'AIG', 0, 'GRV', 'AIG', 0, 'aig', 'GRV', 0, 'AIG', 0]);
gongue.measureAssignments = assign(N_V, range(0, 32)); // M0 = appel Gonguê
const agbe = basePat(1779908314541, 'Padrão 1', ['P', 0, 't', 'p', 'T', 0, 'p', 't', 'P', 0, 't', 'p', 'T', 0, 'p', 't']);
agbe.measureAssignments = assign(N_V, range(1, 32));

const pux1 = basePat(1779908319456, 'Mesure 1', ['P', 0, 0, 0, 'P', 'P', 0, 'P', 'P', 'P', 'P', 'P', 'P', 'P', 0, 'P'],
  { lyrics: ['no', '', '', '', 'Vo', 'vó', '', 'Fa', 'lou', 'E', 'O', 'Ba', 'rão', 'A', '', 'ssi'] });
pux1.measureAssignments = assign(N_V, cyc(0));
const pux2 = basePat(1779908323224, 'Mesure 2', ['P', 0, 'P', 0, 0, 0, 'P', 0, 0, 'P', 0, 'P', 'P', 'P', 0, 'P'],
  { lyrics: ['fa', '', 'ias', '', '', '', 'Na', '', '', 'Mar', '', 'ca', 'ção', 'das', '', 'Al'] });
pux2.measureAssignments = assign(N_V, cyc(1));
const pux3 = basePat(1779923886721, 'Mesure 3', ['P', 0, 0, 0, 0, 0, 'P', 0, 0, 'P', 0, 'P', 'P', 0, 'P', 'P'],
  { lyrics: ['gue', '', '', '', '', '', 'No', '', '', 'Ti', 'li', 'li', 'ta', '', 'Do', 'Gon'] });
pux3.measureAssignments = assign(N_V, cyc(2));
const coroP = basePat(1779923888740, 'Mesure 4 (Réponse)', [0, 0, 0, 0, 'C', 'C', 0, 'C', 'C', 0, 0, 0, 0, 0, 0, 0],
  { lyrics: ['', '', '', '', 'Vo', 'vó', '', 'Fa', 'lou', '', '', '', '', '', '', ''] });
coroP.measureAssignments = assign(N_V, cyc(3));

const vovoPreset = {
  ...tpl,
  name: 'Vovó Falou',
  bpm: 86,
  timeSig: '4/4',
  totalMeasures: N_V,
  version: 3,
  audioScaleVersion: 2,
  measureBpms: Array(N_V).fill(86),
  measureTimeSigs: Array(N_V).fill('4/4'),
  measureBpmTransitions: Array(N_V).fill('immediate'),
  measureVols: Array(N_V).fill(Array.isArray(opanije.measureVols) ? opanije.measureVols[0] : 100),
  measureVolTransitions: Array(N_V).fill(Array.isArray(opanije.measureVolTransitions) ? opanije.measureVolTransitions[0] : 'immediate'),
  measureSignals: Array(N_V).fill(null),
  songSections: [], songMarkers: [], letras: '',
  loopStartMeasure: 0, loopEndMeasure: N_V - 1,
  metadata: { toada: 'Vovó Falou', nacao: 'Samambaia', ritmo: 'Maracatu', compositor: 'Mestre Walter', rhythmSignals: [] },
  tracks: [
    mkTrack(1779908305252, 'Marcante', 0, 'alfaia_grave', [marcante]),
    mkTrack(1779908307194, 'Caixa', 3, 'caixa_baixo', [caixa]),
    mkTrack(1779908312248, 'Gonguê', 5, 'gongue', [gongue]),
    mkTrack(1779908314541, 'Agbê', 6, 'agbe', [agbe]),
    mkTrack(999901, 'Toada', 12, 'toada', [], { isBusFolder: true, isFolded: false, isSequencerFolded: false, selectedPatternId: 0 }),
    mkTrack(999101, 'Puxador', 10, 'puxador', [pux1, pux2, pux3], { busId: BUS_ID }),
    mkTrack(999102, 'Coro', 11, 'coro', [coroP], { busId: BUS_ID })
  ]
};
if (Array.isArray(vovoPreset.rodaTrackOrder)) vovoPreset.rodaTrackOrder = vovoPreset.tracks.map(t => t.id);

const payloads = [
  { id: OPANIJE_ID, name: 'Opanijé', preset: opPreset, audioUrl: null },
  { id: VOVO_ID, name: 'Vovó Falou', preset: vovoPreset, audioUrl: null }
].map(p => ({ ...p, compressed: LZString.compressToBase64(JSON.stringify(p.preset)) }));

console.log('Plan Opanijé (index 0-based) :');
console.log('  Puxador:', plan.puxador.map(([m, p]) => `M${m}:${p.id}`).join(' '));
console.log('  Coro   :', plan.coro.map(([m, p]) => `M${m}:${p.id}`).join(' '));
console.log('Vovó : cycles à', cycles.join(','), '| Gonguê M0 appel');

// =====================================================================
// 3. ÉCRITURE + RELECTURE
// =====================================================================
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL);
await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });
const written = await page.evaluate(async ({ items, uid }) => {
  window.__ALLOW_SANCTUARIZED_RESTORE__ = true;
  await window.signInWithEmailAndPassword(window.firebaseAuth, 'mestre@ogirador.com', 'playwrighttest');
  const db = window.firebaseDb;
  const out = [];
  for (const it of items) {
    const ref = window.doc(db, 'presets', it.id);
    const before = await window.getDoc(ref);
    await window.setDoc(ref, {
      name: it.name, data: it.compressed, ownerId: uid, groupId: 'samambaia', mestreId: uid,
      visibility: 'mestre_group', isDraft: false, isLocked: true, updatedAt: Date.now()
    }, { merge: true });
    const after = (await window.getDoc(ref)).data();
    out.push({ id: it.id, existedBefore: before.exists(), audioUrlKept: !!after.audioUrl, name: after.name, ownerId: after.ownerId, mestreId: after.mestreId,
      groupId: after.groupId, visibility: after.visibility, isDraft: after.isDraft, isLocked: after.isLocked, data: after.data });
  }
  return out;
}, { items: payloads, uid: UID });
await browser.close();

console.log('\n=== RAPPORT (relu depuis Firestore) ===');
const summary = [];
for (const w of written) {
  const d = JSON.parse(LZString.decompressFromBase64(w.data));
  const tracks = d.tracks.map(t => ({
    id: t.id, name: t.customName || t.name, role: t.instrumentRoleKey, busId: t.busId,
    patterns: t.patterns.map(p => ({ id: p.id, steps: flat(p.activeSteps), lyrics: (p.lyrics || []).filter(Boolean).length, vocalMode: p.vocalMode, url: !!p.vocalAudioUrl,
      measures: (p.measureAssignments || []).map((a, i) => a ? i : -1).filter(i => i >= 0) }))
  }));
  summary.push({ Morceau: w.name, ID: w.id, 'totalMeasures': d.totalMeasures, BPM: d.bpm, Pistes: d.tracks.length,
    'Pas actifs': tracks.reduce((s, t) => s + t.patterns.reduce((a, p) => a + p.steps, 0), 0), groupId: w.groupId, visibility: w.visibility, isLocked: w.isLocked, isDraft: w.isDraft });
  console.log(`\n--- ${w.name} : pistes vocales / voix ---`);
  tracks.filter(t => /puxador|coro/i.test(t.name || '')).forEach(t => {
    console.log(`${t.name} id=${t.id} role=${t.role} busId=${t.busId}`);
    t.patterns.forEach(p => console.log(`   pattern ${p.id} [${p.vocalMode || 'steps'}${p.url ? '+url' : ''}] pas=${p.steps} paroles=${p.lyrics} mesures=[${p.measures.join(',')}]`));
  });
  if (w.id === OPANIJE_ID) {
    const ids = d.tracks.map(t => String(t.id));
    console.log('Anciens ids 999101/999102 présents ?', ids.includes('999101') || ids.includes('999102') ? 'OUI (erreur)' : 'non');
  }
}
console.table(summary);
