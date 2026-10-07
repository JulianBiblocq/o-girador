/** LECTURE SEULE — git grep sans filtre JSON : working tree + historique. */
import { execSync } from 'child_process';
const run = (c) => { try { return execSync(c, { encoding: 'utf-8', maxBuffer: 200 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
const H = (t) => console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`);
const SRC = '"*.ts" "*.tsx" "*.js" "*.mjs" "*.cjs"';
const trim = (s, n = 160) => s.length > n ? s.slice(0, n) + '…' : s;
const show = (out, max = 60) => { const l = out.split('\n').filter(Boolean); l.slice(0, max).forEach(x => console.log('  ' + trim(x))); if (l.length > max) console.log(`  … (+${l.length - max} lignes)`); if (!l.length) console.log('  (aucun)'); };

H('git grep -i "opanij" (ts/tsx/js/mjs) — fichiers + nb de lignes');
show(run(`git grep -i -c "opanij" -- ${SRC}`));
H('git grep -i "vovo falou|vovó falou" (ts/tsx/js/mjs)');
show(run(`git grep -i -n -E "vov[oó] falou" -- ${SRC}`));
H('git grep -i 29dIDjgc2vPuDnwjiy9V (tous fichiers) — fichiers');
show(run('git grep -i -c "29dIDjgc2vPuDnwjiy9V"'));
H('git grep -i hJFMrFdzwLezPmeTgVpE (tous fichiers)');
show(run('git grep -i -n "hJFMrFdzwLezPmeTgVpE"'));
H('Non suivis par git (working tree) contenant les IDs/noms, hors node_modules/dist/scratch/recup');
show(run('git grep -i --untracked -l -E "29dIDjgc2vPuDnwjiy9V|hJFMrFdzwLezPmeTgVpE|opanij" -- . ":!node_modules" ":!dist" ":!scratch" ":!recup*"'));

H('Données de morceaux (activeSteps / measureAssignments) hors JSON — HEAD');
show(run(`git grep -c -E "activeSteps|measureAssignments" HEAD -- ${SRC}`), 80);

H('Historique : -S "Opanij" sur ts/tsx/js (tout l\'historique, hors e2e)');
show(run(`git log --all -S"Opanij" --format="%h | %cd | %s" --date=short -- ${SRC}`), 30);
H('Historique : fichiers TS/JS ayant contenu "Vovó Falou"/"Vovo_falou" avec des tableaux de pas');
show(run(`git log --all -G"Vov[oó][_ ]?[Ff]alou" --format="%h | %cd | %s" --date=short -- ${SRC}`), 30);
