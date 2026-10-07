import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== CHECKING GIT FOR BREQUE ===');
try {
  const log = execSync('git log --all --grep=breque -i --oneline', { encoding: 'utf-8', cwd: 'e:/o-girador/o-girador-sequenciador' });
  console.log('Git commits with breque:\n', log);
} catch (e) {
  console.log('Error git log:', e.message);
}

console.log('=== CHECKING FILES CONTAINING BREQUE ===');
try {
  const grepOut = execSync('git grep -i "breque"', { encoding: 'utf-8', cwd: 'e:/o-girador/o-girador-sequenciador' });
  console.log('Git grep breque (truncated first 1000 chars):\n', grepOut.substring(0, 1000));
} catch (e) {
  console.log('No matches or error:', e.message);
}

console.log('\n=== CHECKING CONVENCAO_2 IN fichiers sequenciador ===');
const fPath = 'e:/o-girador/fichiers sequenciador/convencao_2.json';
if (fs.existsSync(fPath)) {
  const content = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
  console.log('convencao_2.json:');
  console.log('Name:', content.name);
  console.log('Total measures:', content.totalMeasures || content.measureBpms?.length);
  console.log('Tracks count:', content.tracks?.length);
  let totalSteps = 0;
  content.tracks?.forEach(t => {
    t.patterns?.forEach(p => {
      totalSteps += (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
    });
  });
  console.log('Active steps:', totalSteps);
  console.log('Tracks names:', content.tracks?.map(t => t.name || t.customName));
}

console.log('\n=== CHECKING TEM MACAIBA ===');
const mPath = 'e:/o-girador/tem_macaiba.json';
if (fs.existsSync(mPath)) {
  const content = JSON.parse(fs.readFileSync(mPath, 'utf-8'));
  console.log('tem_macaiba.json:');
  console.log('Name:', content.name);
  console.log('Total measures:', content.totalMeasures || content.measureBpms?.length);
  console.log('Tracks count:', content.tracks?.length);
  let totalSteps = 0;
  content.tracks?.forEach(t => {
    t.patterns?.forEach(p => {
      totalSteps += (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
    });
  });
  console.log('Active steps:', totalSteps);
  console.log('Tracks names:', content.tracks?.map(t => t.name || t.customName));
}
