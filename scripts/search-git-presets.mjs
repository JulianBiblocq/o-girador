import { execSync } from 'child_process';

const terms = ['vovo', 'macaiba', 'breque', 'vadiar', 'convencao'];

try {
  // Get all committed file paths ever in Git history
  const allFiles = execSync('git log --all --pretty=format: --name-only', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
  
  const uniqueFiles = [...new Set(allFiles)];
  console.log(`Total unique files in Git history: ${uniqueFiles.length}`);

  for (const t of terms) {
    const matched = uniqueFiles.filter(f => f.toLowerCase().includes(t));
    console.log(`\nFiles matching "${t}":`);
    if (matched.length === 0) {
      console.log('  (none)');
    } else {
      matched.forEach(f => console.log('  ' + f));
    }
  }
} catch (e) {
  console.error('Error listing files:', e.message);
}

for (const t of terms) {
  try {
    const logS = execSync(`git log --all -i -S "${t}" --oneline -n 5`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    console.log(`\nCommits adding/removing text "${t}":\n${logS}`);
  } catch (e) {
    console.log(`No commits matching -S "${t}"`);
  }
}
