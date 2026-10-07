import { execSync } from 'child_process';

const branches = execSync('git branch -a --format="%(refname:short)"', { encoding: 'utf-8' })
  .split('\n')
  .map(b => b.trim())
  .filter(Boolean);

console.log(`Checking ${branches.length} branches...`);
for (const b of branches) {
  try {
    const res = execSync(`git grep -i "breque de caixa" ${b}`, { encoding: 'utf-8' });
    if (res) {
      console.log(`Found in branch ${b}:\n`, res);
    }
  } catch (_) {}
}
console.log('Search finished.');
