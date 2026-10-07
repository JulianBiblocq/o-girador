import { execSync } from 'child_process';
import fs from 'fs';

try {
  const out = execSync('git log --all -S HV63gho48hxMmAXM95TN --oneline', { encoding: 'utf-8' });
  console.log('Commits touching HV63gho48hxMmAXM95TN:\n', out);
} catch (e) {
  console.log('Error searching for HV63gho48hxMmAXM95TN:', e.message);
}

// Also check all other repositories in e:\o-girador
const repos = ['e:/o-girador/o-girador-organizador', 'e:/o-girador/o-girador-orquestrador', 'e:/o-girador/o-girador-dancador'];
for (const r of repos) {
  if (fs.existsSync(r + '/.git')) {
    console.log(`\n=== Checking repo ${r} ===`);
    try {
      const gitOut = execSync('git log -S breque -i --oneline -n 5', { cwd: r, encoding: 'utf-8' });
      console.log('Commits matching breque in ' + r + ':\n', gitOut);
    } catch (_) {
      console.log('No matches in ' + r);
    }
  }
}
