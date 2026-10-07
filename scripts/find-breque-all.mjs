import { execSync } from 'child_process';
import fs from 'fs';

const repos = [
  'e:/o-girador/o-girador-sequenciador',
  'e:/o-girador/o-girador-organizador',
  'e:/o-girador/o-girador-orquestrador',
  'e:/o-girador/o-girador-dancador'
];

for (const r of repos) {
  if (fs.existsSync(r + '/.git')) {
    console.log(`Checking ${r}...`);
    try {
      const out = execSync('git log --all -S HV63gho48hxMmAXM95TN --oneline', { cwd: r, encoding: 'utf-8' });
      if (out.trim()) console.log(`  Found ID in ${r}:\n${out}`);
    } catch (e) {
      console.log(`  Error git log -S: ${e.message}`);
    }
    try {
      const out2 = execSync('git log --all --grep="breque" -i --oneline -n 10', { cwd: r, encoding: 'utf-8' });
      if (out2.trim()) console.log(`  Found grep "breque" in ${r}:\n${out2}`);
    } catch (_) {}
  }
}
