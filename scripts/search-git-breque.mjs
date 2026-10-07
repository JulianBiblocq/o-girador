import { execSync } from 'child_process';

const commits = ['3d3fb29', '6479af8', '0821540', '1f8a489'];
for (const c of commits) {
  try {
    const raw = execSync(`git show ${c}`, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' });
    const idx = raw.toLowerCase().indexOf('breque');
    if (idx !== -1) {
      console.log(`Match in commit ${c}:`);
      console.log(raw.slice(Math.max(0, idx - 200), idx + 300));
    }
  } catch (e) {
    console.log(`Error on ${c}:`, e.message);
  }
}
