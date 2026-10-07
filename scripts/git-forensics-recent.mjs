/** LECTURE SEULE — extraction brute Git (aucune écriture Firestore, aucun fichier du dépôt modifié). */
import { execSync } from 'child_process';
const run = (c) => { try { return execSync(c, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return `ERR: ${(e.stdout || '') + (e.stderr || e.message)}`; } };
const H = (t) => console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`);

H('1a. git log --all --since=2026-10-06');
const log = run('git log --all --since="2026-10-06" --format="%H|%h | %cd | %s" --date=local');
console.log(log.split('\n').map(l => l.split('|').slice(1).join('|')).join('\n') || '(aucun)');
const hashes = log.split('\n').filter(Boolean).map(l => l.split('|')[0]);

H('1b. git reflog --since=2026-10-06 -n 30');
console.log(run('git reflog --since="2026-10-06" --format="%h | %gd | %gs" -n 30') || '(vide)');

H('1c. git stash list');
console.log(run('git stash list') || '(aucun stash)');

H('1d. dernier commit toutes branches (contexte)');
console.log(run('git log --all -n 8 --format="%h | %cd | %d | %s" --date=local'));
console.log('HEAD :', run('git rev-parse --abbrev-ref HEAD').trim(), '| statut :');
console.log(run('git status --short').split('\n').slice(0, 25).join('\n') || '(propre)');

H('2. Fichiers touchés par commit (>= 06/10)');
for (const h of hashes) {
  console.log(`\n--- ${run(`git show --no-patch --format="%h | %cd | %s" --date=local ${h}`).trim()}`);
  console.log(run(`git show --name-status --format= ${h}`).trim() || '(aucun fichier)');
}

H('3. Pickaxe -S sur les 2 IDs (depuis 2026-10-01)');
for (const id of ['29dIDjgc2vPuDnwjiy9V', 'hJFMrFdzwLezPmeTgVpE']) {
  console.log(`\n-S ${id} :`);
  const r = run(`git log --all --since="2026-10-01" -S "${id}" --format="%h | %cd | %s" --date=local`);
  console.log(r.trim() || '(aucun commit)');
  console.log(`(tout l'historique, pour référence) :`);
  console.log(run(`git log --all -S "${id}" --format="%h | %cd | %s" --date=local`).trim() || '(aucun)');
}

H('4. e2e/ : 3 derniers commits touchant e2e/ (stat)');
console.log(run('git log -n 3 --stat --format="%n### %h | %cd | %s" --date=local -- e2e/'));
