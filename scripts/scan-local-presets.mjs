import fs from 'fs';
import path from 'path';

function tryParseJson(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    let str;
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      str = buf.toString('utf16le');
    } else {
      str = buf.toString('utf8');
    }
    if (str.charCodeAt(0) === 0xfeff) {
      str = str.slice(1);
    }
    return JSON.parse(str);
  } catch (e) {
    return { error: e.message };
  }
}

const targetDirs = [
  'e:/o-girador',
  'e:/o-girador/fichiers sequenciador',
  'e:/o-girador/BaqueMix/Catalog',
  'e:/o-girador/o-girador-sequenciador/BaqueMix/Catalog',
  'e:/o-girador/o-girador-sequenciador/public/presets'
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`[ABSENT] ${dir}`);
    continue;
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.json')) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const p = tryParseJson(fullPath);
        if (p.error) {
          console.log(`[ERR] ${dir}/${f}: ${p.error}`);
        } else if (Array.isArray(p)) {
          console.log(`[ARRAY ${p.length}] ${dir}/${f}`);
          p.forEach((item, idx) => {
            console.log(`   #${idx}: "${item.name || item.metadata?.toada}" (bpm:${item.bpm}, m:${item.totalMeasures}, tr:${item.tracks?.length})`);
          });
        } else {
          console.log(`[PRESET] ${dir}/${f}: name="${p.name || p.metadata?.toada}" bpm=${p.bpm} m=${p.totalMeasures || p.circles?.length} tr=${p.tracks?.length} circ=${p.circles?.length}`);
        }
      }
    }
  }
}
