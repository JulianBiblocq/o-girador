/** LECTURE SEULE — audit des JSON extraits de 8f938df vs les 6 morceaux officiels. */
import fs from 'fs';
import path from 'path';

const DIR = 'recup_8f938df';
const OFFICIAL = [
  { label: 'Opanijé', re: /opanij/i }, { label: 'Vovó Falou', re: /vov[oó]|falou/i },
  { label: 'Tem macaiba', re: /maca[ií]ba/i }, { label: 'Breque de caixa', re: /breque/i },
  { label: 'Vou vadiar carnaval', re: /vadiar/i }, { label: 'Convenção 2', re: /conven[cç]/i }
];
const flat = (a) => (a || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
const read = (p) => { const b = fs.readFileSync(p); let s = b[0] === 0xff && b[1] === 0xfe ? b.toString('utf16le') : b.toString('utf8'); return JSON.parse(s.replace(/^\uFEFF/, '')); };

function audit(d) {
  const tracks = (d.tracks || []).map(t => {
    const ps = t.patterns || [];
    const m = new Set(); ps.forEach(p => (p.measureAssignments || []).forEach((a, i) => a && m.add(i)));
    return { id: t.id, name: t.customName || t.name || '(sans nom)', inst: t.instrumentIdx, bus: !!t.isBusFolder, busId: t.busId, np: ps.length,
      steps: ps.reduce((s, p) => s + flat(p.activeSteps), 0), lyr: ps.reduce((s, p) => s + (p.lyrics || []).filter(Boolean).length, 0),
      notes: ps.reduce((s, p) => s + (p.notes || []).filter(Boolean).length, 0), measures: m.size };
  });
  return { tracks, bpm: d.bpm, total: d.totalMeasures ?? d.measureBpms?.length,
    signals: (d.measureSignals || []).filter(Boolean).length, tempoCurve: d.measureBpms ? new Set(d.measureBpms).size : 0,
    timeSigs: d.measureTimeSigs ? [...new Set(d.measureTimeSigs)].join(',') : '-' };
}

const found = {};
console.log('=== Fichiers de séquences (tracks) dans recup_8f938df/ ===');
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  let d; try { d = read(path.join(DIR, f)); } catch { continue; }
  if (!d || !(d.tracks || d.circles)) continue;
  const a = audit(d);
  const label = d.name || d.metadata?.toada || f;
  console.log(`\n### ${f}  | nom="${label}" | totalMeasures=${a.total} | bpm=${a.bpm} | pistes=${a.tracks.length} | signaux=${a.signals} | tempos distincts=${a.tempoCurve} | timeSigs=${a.timeSigs}`);
  console.table(a.tracks);
  const hasToada = a.tracks.some(t => /toada/i.test(t.name)), hasPux = a.tracks.some(t => /puxador/i.test(t.name)), hasCoro = a.tracks.some(t => /coro/i.test(t.name));
  console.log(`Toada:${hasToada} Puxador:${hasPux} Coro:${hasCoro} | pas actifs total=${a.tracks.reduce((s, t) => s + t.steps, 0)}`);
  OFFICIAL.forEach(o => { if (o.re.test(f) || o.re.test(label)) found[o.label] = { file: f, ...a }; });
}

console.log('\n=== runs.json (766 KB) : contenu ===');
try {
  const r = read(path.join(DIR, 'runs.json'));
  const s = JSON.stringify(r);
  console.log('type:', Array.isArray(r) ? `Array(${r.length})` : Object.keys(r).slice(0, 12).join(','));
  console.log('contient activeSteps:', s.includes('activeSteps'), '| measureAssignments:', s.includes('measureAssignments'), '| Puxador:', /puxador/i.test(s), '| Opanij:', /opanij/i.test(s), '| 29dIDjgc:', s.includes('29dIDjgc'), '| hJFMrFd:', s.includes('hJFMrFd'));
  console.log('aperçu:', s.slice(0, 300));
} catch (e) { console.log('illisible:', e.message); }

console.log('\n=== BILAN : 6 morceaux officiels dans 8f938df ===');
console.table(OFFICIAL.map(o => { const f = found[o.label]; return f
  ? { Morceau: o.label, Fichier: f.file, Mesures: f.total, BPM: f.bpm, Pistes: f.tracks.length, 'Pas actifs': f.tracks.reduce((s, t) => s + t.steps, 0), Paroles: f.tracks.reduce((s, t) => s + t.lyr, 0), Notes: f.tracks.reduce((s, t) => s + t.notes, 0),
      Toada: f.tracks.some(t => /toada/i.test(t.name)), Puxador: f.tracks.some(t => /puxador/i.test(t.name)), Coro: f.tracks.some(t => /coro/i.test(t.name)) }
  : { Morceau: o.label, Fichier: 'ABSENT de 8f938df' }; }));
