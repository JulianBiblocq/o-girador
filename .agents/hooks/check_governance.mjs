import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { countRealLines, evaluateWriteGuard, } from './pre_write_guard.mjs';
import { evaluateCommandGuard } from './pre_command_ssot_guard.mjs';

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.firebase', 'coverage']);
const RULES_FILE_RE = /^[^/]*(?:firestore|storage)[^/]*\.rules(?:\..+)?$/i;

function git(repoRoot, args, allowFail = false) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function walkDir(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, onFile);
    else onFile(full, entry.name);
  }
}

function extractAddedLinesFromUnifiedDiff(diffText) {
  if (!diffText) return '';
  return diffText
    .split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n');
}

function runStagedPreCommitCheck(repoRoot) {
  const out = git(repoRoot, ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], true) || '';
  const stagedFiles = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const errors = [];

  for (const rel of stagedFiles) {
    const fsPath = path.resolve(repoRoot, rel);
    const oldContent = git(repoRoot, ['show', `HEAD:${rel}`], true);
    const existsBefore = oldContent !== null;
    const newContent = git(repoRoot, ['show', `:${rel}`], true) ?? (fs.existsSync(fsPath) ? fs.readFileSync(fsPath, 'utf8') : '');
    const diffText = git(repoRoot, ['diff', '--cached', '-U0', '--', rel], true) || '';
    const addedText = existsBefore ? extractAddedLinesFromUnifiedDiff(diffText) : newContent;

    const res = evaluateWriteGuard({ fsPath, existsBefore, oldContent: oldContent || '', newContent, addedText });
    if (res.decision === 'deny') errors.push(res.reason);
  }

  if (errors.length > 0) {
    console.error('🚨 [Pre-Commit O Girador] Commit bloqué par la gouvernance :\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(2);
  }
  process.exit(0);
}

function runFullRepoGovernanceCheck(repoRoot) {
  const repoName = path.basename(repoRoot);
  const isOrquestrador = repoName.toLowerCase() === 'o-girador-orquestrador';
  const errors = [];

  // 1. Audit SSOT firebase.json + absence récursive de fichiers *.rules* satellites
  const fbPath = path.join(repoRoot, 'firebase.json');
  if (fs.existsSync(fbPath) && !isOrquestrador) {
    const cfg = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
    const bad = ['firestore', 'storage'].filter((k) => k in cfg);
    if (bad.length > 0) errors.push(`[SSOT] ${repoName}/firebase.json contient : ${bad.join(', ')}`);
  }
  if (!isOrquestrador) {
    walkDir(repoRoot, (full, name) => {
      if (RULES_FILE_RE.test(name)) {
        errors.push(`[SSOT] Fichier de règles interdit détecté : ${path.relative(repoRoot, full)}`);
      }
    });
  }

  // 2. Audit des scripts package.json
  const pkgPath = path.join(repoRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    for (const [k, cmd] of Object.entries(pkg.scripts || {})) {
      if (k === 'deploy:functions') continue;
      const res = evaluateCommandGuard({ commandLine: String(cmd), cwd: repoRoot });
      if (res.decision === 'deny') errors.push(`[package.json:${k}] ${res.reason}`);
    }
  }

  // 3. Audit Règle 0 sur les fichiers de gouvernance du dépôt
  const govFiles = [
    path.join(repoRoot, '.agents', 'AGENTS.md'),
    path.join(repoRoot, '.cursorrules'),
    path.join(repoRoot, '.agents', 'rules', 'deployment.md')
  ];
  for (const gf of govFiles) {
    if (!fs.existsSync(gf)) continue;
    const txt = fs.readFileSync(gf, 'utf8');
    const res = evaluateWriteGuard({ fsPath: gf, existsBefore: false, oldContent: '', newContent: txt, addedText: txt });
    if (res.decision === 'deny') errors.push(res.reason);
  }

  // 4. Bilan du plafond < 145 lignes réelles dans src/
  let totalSrc = 0;
  let over145 = 0;
  walkDir(path.join(repoRoot, 'src'), (full) => {
    if (!/\.(?:js|jsx|ts|tsx|mjs|cjs|css|scss)$/i.test(full)) return;
    if (/src[\\/]locales[\\/][^\\/]+\.(?:js|ts|json)$/i.test(full)) return;
    totalSrc++;
    if (countRealLines(fs.readFileSync(full, 'utf8')) >= 145) over145++;
  });

  if (errors.length > 0) {
    console.error(`❌ [${repoName}] Échec gouvernance :\n` + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`✅ [${repoName}] Gouvernance SSOT & Règle 0 conformes | Fichiers src/ < 145 L : ${totalSrc - over145}/${totalSrc} (dette legacy sous cliquet : ${over145})`);
}

const repoRoot = process.cwd();
if (process.argv.includes('--staged')) {
  runStagedPreCommitCheck(repoRoot);
} else {
  runFullRepoGovernanceCheck(repoRoot);
}
