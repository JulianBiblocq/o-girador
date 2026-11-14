import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Expression régulière Règle 0 codée sans aucun littéral interdit
const RULE0_APOS_RE = /\b(?:O[\x27\u2019\u02BC\s-]*)?(?:Organizad|S[e\u00e9]quenciad|Cantad|Or(?:qu|ch)estrad|Mostrad|Dan[c\u00e7]ad|Afinad|Girad)[\x27\u2019\u02BC`][Oo]r\b/u;
const RULE0_ACCENT_SEQ_RE = /\bS\u00e9quenciador\b/u;
const RULE0_ORCH_RE = /\bOrchestrador\b/i;

const RULES_FILE_RE = /(?:^|\/)[^/]*(?:firestore|storage)[^/]*\.rules(?:\.[^/]*)?$/i;
const SRC_CODE_RE = /(?:^|\/)src\/.*\.(?:js|jsx|ts|tsx|mjs|cjs|css|scss)$/i;
const PURE_LOCALE_DICT_RE = /(?:^|\/)src\/locales\/[^/]+\.(?:js|ts|json)$/i;
const LEGAL_ALLOWLIST_RE = /(?:LegalView|legalNotice|MentionsLegales|PrivacyPolicy|CGU|CGV)/i;

export function countRealLines(text) {
  if (!text) return 0;
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
}

function stripJsComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

export function evaluateWriteGuard({ fsPath, existsBefore, oldContent = '', newContent = '', addedText = '' }) {
  const normPath = String(fsPath || '').replace(/\\/g, '/');
  if (!normPath) return { decision: 'allow' };

  const isOrquestrador = /(?:^|\/)o-girador-orquestrador(?:\/|$)/i.test(normPath);
  const isBackupArchive = /(?:^|\/)\.backups_rules_/i.test(normPath);

  // 1. Intégrité SSOT Firebase (fichiers .rules et firebase.json satellites)
  if (RULES_FILE_RE.test(normPath) && !isOrquestrador && !isBackupArchive) {
    return {
      decision: 'deny',
      reason: `[SSOT Firebase] Interdiction formelle de créer ou modifier un fichier de règles hors de o-girador-orquestrador (${normPath}).`
    };
  }
  if (/(?:^|\/)firebase\.json$/i.test(normPath) && !isOrquestrador) {
    try {
      const parsed = JSON.parse(newContent);
      const forbidden = ['firestore', 'storage'].filter((k) => k in parsed);
      if (forbidden.length > 0) {
        return {
          decision: 'deny',
          reason: `[SSOT Firebase] Sections interdites (${forbidden.join(', ')}) dans un firebase.json satellite (${normPath}).`
        };
      }
    } catch {
      return { decision: 'deny', reason: `[SSOT Firebase] JSON invalide dans ${normPath}.` };
    }
  }

  // 2. Plafond strict < 145 lignes réelles & Mode Cliquet (Ratchet) dans src/
  if (SRC_CODE_RE.test(normPath) && !PURE_LOCALE_DICT_RE.test(normPath)) {
    const newLines = countRealLines(newContent);
    if (!existsBefore) {
      if (newLines >= 145) {
        return {
          decision: 'deny',
          reason: `[Plafond < 145 lignes] Nouveau fichier refusé (${newLines} lignes >= 145 dans ${normPath}). Maximum autorisé : 144 lignes réelles.`
        };
      }
    } else {
      const oldLines = countRealLines(oldContent);
      if (oldLines < 145 && newLines >= 145) {
        return {
          decision: 'deny',
          reason: `[Plafond < 145 lignes] Fichier conforme (${oldLines} L) poussé à ${newLines} lignes (>= 145) dans ${normPath}. Extrayez un sous-module.`
        };
      }
      if (oldLines >= 145 && newLines > oldLines) {
        return {
          decision: 'deny',
          reason: `[Cliquet Anti-Monolithe] Croissance interdite sur fichier legacy (${oldLines} L -> ${newLines} L dans ${normPath}). Appliquez la règle Boy-Scout (newLines <= oldLines).`
        };
      }
    }
  }

  // 3. Règle 0 : Orthographe brésilienne pure des 8 applications
  const aposMatch = addedText.match(RULE0_APOS_RE) || addedText.match(RULE0_ACCENT_SEQ_RE) || addedText.match(RULE0_ORCH_RE);
  if (aposMatch) {
    return {
      decision: 'deny',
      reason: `[Règle 0 Nommage] Graphie interdite détectée ("${aposMatch[0]}") dans ${normPath}. Utilisez exclusivement : O Girador, Orquestrador, Organizador, Sequenciador, Cantador, Dançador, Mostrador, Afinador.`
    };
  }

  // 4. Interdiction de "Bateria" en contexte Maracatu & de "IA" dans l'interface utilisateur
  const isSrcFile = /(?:^|\/)src\//i.test(normPath);
  const isUiOrLocale = isSrcFile && (/\.(?:jsx|tsx)$/i.test(normPath) || /(?:locales|Translations|I18n|i18n)/i.test(normPath));
  const isMaracatuPath = /(?:^|\/)maracatu(?:\/|$)/i.test(normPath) || /maracatu/i.test(path.basename(normPath));
  const isSambaOrBatucadaPath = /(?:^|\/)(?:samba|batucada|sambareggae|samba_reggae)(?:\/|$)/i.test(normPath);

  if (isMaracatuPath && /\b[Bb]ateria\b/.test(addedText)) {
    return {
      decision: 'deny',
      reason: `[Lexique Maracatu] Le terme "Bateria" est interdit dans l'univers Maracatu (${normPath}). Utilisez "Batuque" ou "Baque".`
    };
  }
  if (isUiOrLocale && !isSambaOrBatucadaPath) {
    const offendingBateriaLine = addedText.split(/\r?\n/).find(
      (line) => /\b[Bb]ateria\b/.test(line) && !/(?:samba|batucada|capoeira)/i.test(line)
    );
    if (offendingBateriaLine) {
      return {
        decision: 'deny',
        reason: `[Lexique Maracatu] "Bateria" interdit hors dictionnaire Samba/Batucada explicite (${normPath}). Utilisez "Batuque", "Baque" ou terminology.instrumentGroup.`
      };
    }
  }

  if (isUiOrLocale && !LEGAL_ALLOWLIST_RE.test(normPath)) {
    const codeWithoutComments = stripJsComments(addedText);
    const iaMatch = codeWithoutComments.match(/\bIA\b|\bIntelligence\s+Artificielle\b|\bIntelig[\u00ea\u00e9e]ncia\s+Artificial\b/u);
    if (iaMatch) {
      return {
        decision: 'deny',
        reason: `[Lexique UI] Mention "${iaMatch[0]}" interdite dans l'interface utilisateur (${normPath}). Utilisez un terme métier artisanal.`
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
  const baseCwd = payload?.cwd || process.cwd();

  if (toolName !== 'write_file' && toolName !== 'edit_file') {
    process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
    process.exit(0);
  }

  const rawTarget = args.Path || args.file_path || args.path || '';
  const fsPath = path.isAbsolute(rawTarget) ? rawTarget : path.resolve(baseCwd, rawTarget);
  const existsBefore = fs.existsSync(fsPath);
  const oldContent = existsBefore ? fs.readFileSync(fsPath, 'utf8') : '';

  let newContent = oldContent;
  let addedText = '';
  if (toolName === 'write_file') {
    const content = String(args.Content ?? args.content ?? '');
    newContent = args.Append ? oldContent + content : content;
    addedText = content;
  } else {
    const target = String(args.Target ?? args.old_string ?? '');
    const replacement = String(args.Replacement ?? args.new_string ?? '');
    newContent = target ? oldContent.split(target).join(replacement) : oldContent;
    addedText = replacement;
  }

  const result = evaluateWriteGuard({ fsPath, existsBefore, oldContent, newContent, addedText });
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
