/** LECTURE SEULE sur Git — inventaire + extraction brute (octets inchangés) des JSON du commit 8f938df vers recup_8f938df/. */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const H = '8f938df';
const run = (c) => execSync(c, { encoding: 'utf-8', maxBuffer: 200 * 1024 * 1024 });

console.log(`=== git show --stat ${H} (extrait) ===`);
console.log(run(`git show --stat --format="%H%n%an | %cd%n%s%n%b" --date=local ${H}`).split('\n').slice(0, 60).join('\n'));

console.log(`\n=== Fichiers JSON de l'arbre ${H} ===`);
const files = run(`git ls-tree -r --name-only ${H}`).split('\n').filter(f => /\.json$/i.test(f));
files.forEach(f => console.log('  ' + f));
console.log(`(${files.length} fichiers)`);

fs.mkdirSync('recup_8f938df', { recursive: true });
const manifest = [];
const used = new Set();
for (const f of files) {
  if (/(^|\/)(node_modules|package(-lock)?\.json$|tsconfig|\.firebase|playwright-report)/.test(f)) continue;
  let name = path.basename(f);
  if (used.has(name)) name = f.replace(/[\\/]/g, '__');
  used.add(name);
  // Octets bruts : aucune ré-encodage, équivalent exact de `git show H:path > fichier`
  const buf = execSync(`git show ${H}:"${f}"`, { maxBuffer: 200 * 1024 * 1024 });
  fs.writeFileSync(path.join('recup_8f938df', name), buf);
  manifest.push({ source: f, out: name, bytes: buf.length });
}
fs.writeFileSync('recup_8f938df/_manifest.txt', manifest.map(m => `${m.out}\t<= ${H}:${m.source}\t${m.bytes}`).join('\n'), 'utf-8');
console.log(`\n${manifest.length} fichiers extraits dans recup_8f938df/`);
console.table(manifest);
