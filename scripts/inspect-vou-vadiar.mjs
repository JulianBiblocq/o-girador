import fs from 'fs';

const p = JSON.parse(fs.readFileSync('public/presets/Vou vadiar carnaval.json', 'utf-8'));
console.log('Metadata:', p.metadata);
console.log('totalMeasures:', p.totalMeasures);
console.log('BPM:', p.bpm);
p.tracks?.forEach((t, i) => {
  console.log(`\nTrack ${i}: id=${t.id}, name=${t.name}, customName=${t.customName}, instIdx=${t.instrumentIdx}`);
  t.patterns?.forEach((pat, pi) => {
    console.log(`  Pattern ${pi} (${pat.name}): steps=${pat.steps}`);
    console.log(`    activeSteps:`, JSON.stringify(pat.activeSteps));
    console.log(`    lyrics:`, JSON.stringify(pat.lyrics?.filter(Boolean)));
    console.log(`    assignments:`, JSON.stringify(pat.measureAssignments));
  });
});
