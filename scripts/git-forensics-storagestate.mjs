/** LECTURE SEULE — inspecte e2e/storageState.json à travers les commits (localStorage / IndexedDB Playwright). */
import { execSync } from 'child_process';
const run = (c) => { try { return execSync(c, { encoding: 'utf-8', maxBuffer: 200 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };

const commits = run('git log --all --since="2026-09-20" --format="%h|%cd|%s" --date=short -- e2e/storageState.json').trim().split('\n').filter(Boolean);
console.log(`${commits.length} commits touchant e2e/storageState.json depuis 2026-09-20\n`);
for (const line of commits) {
  const [h, d, s] = line.split('|');
  const raw = run(`git show ${h}:e2e/storageState.json`);
  let j; try { j = JSON.parse(raw); } catch { console.log(`${h} ${d} : JSON illisible`); continue; }
  const origins = (j.origins || []).map(o => ({
    origin: o.origin,
    localStorage: (o.localStorage || []).map(x => `${x.name}(${String(x.value).length}c)`),
    indexedDB: (o.indexedDB || []).map(db => `${db.name}:${(db.stores || []).map(st => `${st.name}[${(st.records || []).length}]`).join(',')}`)
  }));
  console.log(`## ${h} | ${d} | ${s.slice(0, 70)} | cookies=${(j.cookies || []).length}`);
  origins.forEach(o => console.log(`   ${o.origin}\n     LS: ${o.localStorage.join(' ')}\n     IDB: ${o.indexedDB.join(' ') || '(aucune)'}`));
  const blob = JSON.stringify(j);
  console.log(`   contient activeSteps:${blob.includes('activeSteps')} measureAssignments:${blob.includes('measureAssignments')} Puxador:${/puxador/i.test(blob)} vocalRecordings:${blob.includes('vocalRecordings')}`);
}

console.log('\n=== Recherche de données de séquence dans tous les commits >= 2026-10-01 (hors dossiers déjà connus) ===');
const all = run('git log --all --since="2026-10-01" --format="%h" ').trim().split('\n').filter(Boolean);
for (const h of all) {
  const hits = run(`git grep -l -E "measureAssignments|activeSteps" ${h} -- "*.json" "e2e/fixtures" "e2e/mocks"`).trim();
  const jsonOnly = hits ? hits.split('\n').map(l => l.split(':').slice(1).join(':')) : [];
  console.log(`${h} : ${jsonOnly.length ? jsonOnly.join(', ') : '(aucun JSON/fixture avec séquences)'}`);
}

console.log('\n=== Fixtures/mocks dans e2e/ (HEAD) ===');
console.log(run('git ls-tree -r --name-only HEAD e2e/ ').split('\n').filter(f => !/\.spec\.ts$/.test(f) && f).join('\n') || '(aucun)');
console.log('\nspec contenant des presets en dur (activeSteps/measureAssignments) à HEAD :');
console.log(run('git grep -l -E "activeSteps|measureAssignments" HEAD -- e2e/').trim() || '(aucun)');
