import fs from 'fs';
import path from 'path';

function countRealLines(text) {
  if (!text) return 0;
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
}

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') res.push(...walk(p));
    } else if (/\.(tsx?|css)$/.test(f)) {
      res.push(p);
    }
  }
  return res;
}

const targetDir = process.argv[2] || 'src';
const allFiles = walk(targetDir);

let overLimit = [];
let windowConfirms = [];

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = countRealLines(content);
  if (lines >= 145) {
    overLimit.push({ file: f, lines });
  }
  if (content.includes('window.confirm(') || content.includes('window.confirm (')) {
    windowConfirms.push(f);
  }
}

overLimit.sort((a, b) => b.lines - a.lines);

console.log(`\n--- VÉRIFICATION LIGNES (Plafond strict : < 145 lignes réelles) ---`);
console.log(`Total analysé : ${allFiles.length} fichiers.`);
console.log(`Fichiers >= 145 lignes : ${overLimit.length}`);
if (overLimit.length > 0) {
  console.log(`Top 20 dépassant la limite :`);
  overLimit.slice(0, 20).forEach((x) => console.log(`  - [${x.lines} l.] ${x.file}`));
}

if (windowConfirms.length > 0) {
  console.log(`\n⚠️ Fichiers avec window.confirm :`);
  windowConfirms.forEach((x) => console.log(`  - ${x}`));
} else {
  console.log(`\n✅ 0 appel window.confirm.`);
}

if (overLimit.length > 0) {
  process.exit(1);
}
