import fs from 'fs';
import { execSync } from 'child_process';

console.log('=== TEM MACAIBA ===');
if (fs.existsSync('../tem_macaiba.json')) {
  const macaiba = JSON.parse(fs.readFileSync('../tem_macaiba.json', 'utf-8'));
  console.log({
    name: macaiba.name,
    bpm: macaiba.bpm,
    totalMeasures: macaiba.totalMeasures,
    tracksCount: macaiba.tracks?.length,
    tracks: macaiba.tracks?.map(t => ({
      id: t.id,
      name: t.name,
      customName: t.customName,
      instIdx: t.instrumentIdx,
      isBus: t.isBusFolder,
      busId: t.busId,
      patternsCount: t.patterns?.length
    }))
  });
} else {
  console.log('tem_macaiba.json NOT FOUND');
}

console.log('\n=== VOU VADIAR CARNAVAL ===');
const vouVadiarPath = 'public/presets/Vou vadiar carnaval.json';
if (fs.existsSync(vouVadiarPath)) {
  const vv = JSON.parse(fs.readFileSync(vouVadiarPath, 'utf-8'));
  console.log({
    name: vv.name,
    bpm: vv.bpm,
    totalMeasures: vv.totalMeasures,
    tracksCount: vv.tracks?.length,
    tracks: vv.tracks?.map(t => ({
      id: t.id,
      name: t.name,
      customName: t.customName,
      instIdx: t.instrumentIdx,
      isBus: t.isBusFolder,
      patternsCount: t.patterns?.length,
      patternsLyrics: t.patterns?.map(p => ({
        name: p.name,
        lyrics: p.lyrics?.filter(Boolean)
      }))
    }))
  });
} else {
  console.log('Vou vadiar carnaval.json NOT FOUND');
}

console.log('\n=== CONVENÇÃO 2 ===');
const convPath = '../fichiers sequenciador/convencao_2.json';
if (fs.existsSync(convPath)) {
  const conv = JSON.parse(fs.readFileSync(convPath, 'utf-8'));
  console.log({
    name: conv.name,
    bpm: conv.bpm,
    totalMeasures: conv.totalMeasures,
    tracksCount: conv.tracks?.length,
    tracks: conv.tracks?.map(t => ({
      id: t.id,
      name: t.name,
      customName: t.customName,
      instIdx: t.instrumentIdx,
      isBus: t.isBusFolder,
      busId: t.busId,
      patternsCount: t.patterns?.length
    }))
  });
} else {
  console.log('convencao_2.json NOT FOUND');
}
