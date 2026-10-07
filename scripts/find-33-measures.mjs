import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const sh = (c, opts = {}) => { try { return execSync(c, { encoding: 'utf-8', maxBuffer: 200 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], ...opts }); } catch { return ''; } };

function measuresOf(d) {
  if (!d || typeof d !== 'object') return 0;
  if (d.totalMeasures) return d.totalMeasures;
  if (d.measureBpms) return d.measureBpms.length;
  let m = 0;
  (d.tracks || []).forEach(t => (t.patterns || []).forEach(p => { m = Math.max(m, (p.measureAssignments || []).length); }));
  return m;
}
function stats(d) {
  let steps = 0, lyr = 0;
  (d.tracks || []).forEach(t => (t.patterns || []).forEach(p => {
    steps += (p.activeSteps || []).filter(s => s && s !== '0').length;
    lyr += (p.lyrics || []).filter(Boolean).length;
  }));
  return { steps, lyr };
}
function tryParse(s) { try { return JSON.parse(s.replace(/^\uFEFF/, '')); } catch { return null; } }

console.log('=== 1. git log -S (pickaxe) ===');
for (const q of ['"totalMeasures": 33', 'totalMeasures: 33', 'totalMeasures":33']) {
  console.log(`-- ${q}`);
  console.log(sh(`git log --all -S"${q.replace(/"/g, '\\"')}" --oneline`) || '(aucun)');
}

console.log('=== 2. Scan JSON de tous commits/branches (nom contenant vovo/falou OU 33 mesures) ===');
const log = sh('git log --all --name-only --pretty=format:"COMMIT:%H|%cd|%s" --date=short -- "*.json"');
let cur = null; const seen = new Set(); const hits = [];
for (const line of log.split('\n')) {
  const l = line.trim(); if (!l) continue;
  if (l.startsWith('COMMIT:')) { const [h, d, s] = l.slice(7).split('|'); cur = { h, d, s }; continue; }
  if (!cur || !l.endsWith('.json') || /node_modules|package|tsconfig|firebase|playwright/i.test(l)) continue;
  const key = cur.h + ':' + l; if (seen.has(key)) continue; seen.add(key);
  const raw = sh(`git show ${cur.h}:"${l}"`); if (!raw) continue;
  const d = tryParse(raw); if (!d || !(d.tracks || d.circles)) continue;
  const m = measuresOf(d);
  const nameHit = /vov|falou/i.test(l) || /vov|falou/i.test(d.name || '') || /vov|falou/i.test(d.metadata?.toada || '');
  if (m === 33 || nameHit) hits.push({ commit: cur.h.slice(0, 7), date: cur.d, path: l, measures: m, tracks: (d.tracks || d.circles).length, ...stats(d), bpm: d.bpm });
}
console.table(hits);

console.log('=== 3. Stashes (contenu) ===');
console.log(sh('git stash list') || '(aucun stash)');

console.log('=== 4. Disque E:/o-girador (hors node_modules/.git/dist) ===');
const found = [];
function walk(dir, depth = 0) {
  if (depth > 6) return;
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (['node_modules', '.git', 'dist', 'OpenJDK26U-jdk_x64_windows_hotspot_26.0.2_10', 'WAV'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1);
    else if (/\.json$/i.test(e.name) && fs.statSync(p).size > 500) {
      const buf = fs.readFileSync(p); const s = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8');
      const d = tryParse(s); if (!d || !(d.tracks || d.circles)) continue;
      const m = measuresOf(d);
      if (m === 33 || /vov|falou/i.test(p) || /vov|falou/i.test(d.name || '')) found.push({ path: p, measures: m, tracks: (d.tracks || d.circles).length, ...stats(d), bpm: d.bpm });
    }
  }
}
walk('e:/o-girador');
console.table(found);
