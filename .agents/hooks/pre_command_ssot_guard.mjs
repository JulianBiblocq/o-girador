import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function sanitizeQuotedMessages(cmd) {
  // Neutralise le contenu des messages de commit (-m "..." / -m '...') pour éviter les faux positifs
  return cmd
    .replace(/(?:^|\s)-m\s+"(?:\\.|[^"\\])*"/g, ' -m ""')
    .replace(/(?:^|\s)-m\s+'[^']*'/g, " -m ''");
}

function resolveSegmentCwd(segment, currentCwd) {
  const cdMatch = segment.match(/^\s*(?:cd|Set-Location|Push-Location)\s+(?:\/d\s+)?["']?([^"';&|\r\n]+)["']?/i);
  if (!cdMatch) return currentCwd;
  const target = cdMatch[1].trim();
  return path.isAbsolute(target) ? target : path.resolve(currentCwd, target);
}

function isOrquestradorRoot(cwdPath) {
  const norm = String(cwdPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  return /(?:^|\/)o-girador-orquestrador(?:\/functions)?$/i.test(norm);
}

export function evaluateCommandGuard({ commandLine, cwd }) {
  const rawCmd = String(commandLine || '');
  if (!rawCmd.trim()) return { decision: 'allow' };

  const cleaned = sanitizeQuotedMessages(rawCmd);
  const segments = cleaned.split(/\s*(?:&&|\|\||;|\r?\n)\s*/);
  let effectiveCwd = cwd || process.cwd();

  for (const seg of segments) {
    effectiveCwd = resolveSegmentCwd(seg, effectiveCwd);
    const inOrquestrador = isOrquestradorRoot(effectiveCwd);

    // Garde sur les scripts npm raccourcis risqués
    if (/\bnpm(?:\.cmd)?\s+run\s+deploy:rules\b/i.test(seg) && !inOrquestrador) {
      return {
        decision: 'deny',
        reason: `[SSOT Firebase] "npm run deploy:rules" est strictement réservé à o-girador-orquestrador (cwd actuel : ${effectiveCwd}).`
      };
    }
    if (/\bnpm(?:\.cmd)?\s+run\s+deploy:functions\b/i.test(seg) && !inOrquestrador) {
      return {
        decision: 'deny',
        reason: `[Protection Cloud Functions] "npm run deploy:functions" non qualifié bloqué depuis ${effectiveCwd} pour prévenir toute suppression des fonctions partagées sur o-girador-7828c.`
      };
    }

    // Détection de toute invocation firebase / firebase-tools deploy
    const deployMatch = seg.match(/(?:^|\s|\/|\\)firebase(?:-tools)?(?:\.cmd|\.exe)?\s+deploy\b(.*)$/i);
    if (!deployMatch) continue;

    const deployArgs = deployMatch[1] || '';
    const onlyMatch = deployArgs.match(/(?:^|\s)--only(?:\s+|=)["']?([^"'\s]+)["']?/i);

    if (!onlyMatch) {
      return {
        decision: 'deny',
        reason: `[SSOT Firebase] Commande "firebase deploy" globale sans flag "--only" formellement interdite (${seg.trim()}).`
      };
    }

    const targets = onlyMatch[1]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const touchesRules = targets.some((t) => /^(?:firestore|storage)(?::|$)/i.test(t));
    if (touchesRules && !inOrquestrador) {
      return {
        decision: 'deny',
        reason: `[SSOT Firebase] Tentative illégale de déployer des règles (${targets.join(', ')}) depuis un dépôt hors SSOT (${effectiveCwd}). Seul o-girador-orquestrador y est autorisé.`
      };
    }

    const hasUnqualifiedFunctions = targets.some((t) => t.toLowerCase() === 'functions');
    if (hasUnqualifiedFunctions) {
      return {
        decision: 'deny',
        reason: `[Protection Cloud Functions] "firebase deploy --only functions" non qualifié est bloqué sur o-girador-7828c (collision default vs orquestrador). Utilisez "functions:orquestrador" ou "functions:<nomExact>".`
      };
    }
  }

  return { decision: 'allow' };
}

function runCli() {
  const rawStdin = fs.readFileSync(0, 'utf8').trim();
  if (!rawStdin) {
    process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
    process.exit(0);
  }
  const payload = JSON.parse(rawStdin);
  const toolName = payload?.toolCall?.name || payload?.tool_name || '';
  const args = payload?.toolCall?.args || payload?.tool_input || {};
  const baseCwd = args.Cwd || payload?.cwd || process.cwd();

  if (toolName && toolName !== 'run_command' && toolName !== 'Bash' && toolName !== 'bash') {
    process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
    process.exit(0);
  }

  const commandLine = args.CommandLine ?? args.command ?? '';
  const result = evaluateCommandGuard({ commandLine, cwd: baseCwd });
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.decision === 'deny') {
    if (!process.argv.includes('--agy-hook')) {
      process.stderr.write(`❌ ${result.reason}\n`);
      process.exit(2);
    }
  }
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runCli();
}
