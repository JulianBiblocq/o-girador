import fs from 'fs';
import path from 'path';

const RECOVERY_DIR = 'recup_presets_git';

function summarize(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`\n======================================================`);
  console.log(`FILE: ${filePath}`);
  console.log(`======================================================`);
  if (data.circles) {
    console.log(`Format: Circles (v1)`);
    console.log(`Circles count: ${data.circles.length}`);
    data.circles.forEach((c, idx) => {
      const active = (c.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
      const lyrics = (c.lyrics || []).filter(Boolean);
      console.log(`  Circle ${idx} [inst:${c.instrumentIdx}]: ${active} steps, lyrics: [${lyrics.join(', ')}]`);
    });
  } else if (data.tracks) {
    console.log(`Format: Tracks (v3)`);
    console.log(`Total measures: ${data.totalMeasures || data.measureBpms?.length}`);
    console.log(`Tracks count: ${data.tracks.length}`);
    data.tracks.forEach((t, idx) => {
      console.log(`  Track ${idx} (${t.name || t.customName || 'id:' + t.id}) - Bus: ${!!t.isBusFolder} inst:${t.instrumentIdx}:`);
      (t.patterns || []).forEach((p, pIdx) => {
        const active = (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '');
        const lyrics = (p.lyrics || []).filter(Boolean);
        const notes = (p.notes || []).filter(Boolean);
        const assigned = (p.measureAssignments || []).map((a, mIdx) => a ? mIdx + 1 : null).filter(Boolean);
        console.log(`    Pattern ${pIdx} (${p.name || 'unnamed'}): activeSteps=${active.length} (${active.slice(0, 8).join(',')}${active.length > 8 ? '...' : ''}), assigned to measures [${assigned.join(', ')}], lyrics=${lyrics.length}${lyrics.length ? ' (' + lyrics.join(' ') + ')' : ''}, notes=${notes.length}${notes.length ? ' (' + notes.join(' ') + ')' : ''}`);
      });
    });
  }
}

const files = fs.readdirSync(RECOVERY_DIR);
files.forEach(f => {
  summarize(path.join(RECOVERY_DIR, f));
});

// Also summarize fichiers sequenciador/convencao_2.json
if (fs.existsSync('e:/o-girador/fichiers sequenciador/convencao_2.json')) {
  summarize('e:/o-girador/fichiers sequenciador/convencao_2.json');
}
