import fs from 'fs';

const data = JSON.parse(fs.readFileSync('recup-opanije-43mesures.json', 'utf-8'));
console.log('Keys:', Object.keys(data));
console.log('Name:', data.name);
console.log('BPM:', data.bpm);
console.log('TimeSig:', data.timeSig);
console.log('TotalMeasures:', data.totalMeasures);
console.log('Metadata:', data.metadata);
console.log('Tracks count:', data.tracks?.length);

data.tracks?.forEach((t, i) => {
  console.log(`\nTrack ${i}: ${t.name} (id: ${t.id}, customName: ${t.customName}, instIdx: ${t.instrumentIdx}, isBus: ${t.isBusFolder}, busId: ${t.busId}, role: ${t.instrumentRoleKey}, patterns: ${t.patterns?.length})`);
  t.patterns?.forEach(p => {
    const active = p.activeSteps?.filter(x => x !== 0 && x !== '0')?.length || 0;
    const lyrics = p.lyrics?.filter(Boolean) || [];
    const notes = p.notes?.filter(Boolean) || [];
    const assigned = p.measureAssignments?.filter(Boolean)?.length || 0;
    console.log(`   Pat: "${p.name}" (steps: ${p.steps}, active: ${active}, assignedMeasures: ${assigned}/${p.measureAssignments?.length})`);
    if (lyrics.length > 0) {
      console.log(`      Paroles:`, lyrics);
    }
    if (notes.length > 0) {
      console.log(`      Notes:`, notes);
    }
  });
});
