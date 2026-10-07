/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script d'extraction exhaustive des véritables séquences complètes
 * depuis l'historique Git et les sauvegardes locales.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const RECOVERY_DIR = 'recup_presets_git';
if (!fs.existsSync(RECOVERY_DIR)) {
  fs.mkdirSync(RECOVERY_DIR, { recursive: true });
}

function tryParseJson(text) {
  try {
    let clean = text.trim();
    if (clean.charCodeAt(0) === 0xfeff) {
      clean = clean.slice(1);
    }
    return JSON.parse(clean);
  } catch (_) {
    return null;
  }
}

function analyzePreset(data) {
  if (!data || typeof data !== 'object') return null;

  // Si c'est au format 'circles' (ancien format circulaire v1)
  if (data.circles && Array.isArray(data.circles)) {
    let activeStepsCount = 0;
    let lyricsCount = 0;
    let notesCount = 0;
    const tracksList = [];

    data.circles.forEach((c, idx) => {
      const active = (c.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
      activeStepsCount += active;
      const lyrics = (c.lyrics || []).filter(Boolean).length;
      lyricsCount += lyrics;
      const notes = (c.notes || []).filter(Boolean).length;
      notesCount += notes;

      tracksList.push({
        name: c.name || `Circle ${idx}`,
        instrumentIdx: c.instrumentIdx,
        activeSteps: active,
        lyrics,
        notes
      });
    });

    return {
      format: 'v1_circles',
      name: data.name || data.metadata?.toada || data.title,
      bpm: data.bpm,
      totalMeasures: data.circles.length, // Dans v1, chaque cercle ou repeat représentait des mesures
      tracksCount: data.circles.length,
      activeStepsCount,
      lyricsCount,
      notesCount,
      tracks: tracksList,
      metadata: data.metadata,
      raw: data
    };
  }

  // Format v2 / v3 (Timeline, Tracks, Patterns)
  if (data.tracks && Array.isArray(data.tracks)) {
    let activeStepsCount = 0;
    let lyricsCount = 0;
    let notesCount = 0;
    let totalAssignedPatternMeasures = 0;
    const tracksList = [];

    data.tracks.forEach((t, idx) => {
      let trackActive = 0;
      let trackLyrics = 0;
      let trackNotes = 0;

      (t.patterns || []).forEach(p => {
        const active = (p.activeSteps || []).filter(s => s && s !== 0 && s !== '0' && s !== '').length;
        trackActive += active;
        const lyrics = (p.lyrics || []).filter(Boolean).length;
        trackLyrics += lyrics;
        const notes = (p.notes || []).filter(Boolean).length;
        trackNotes += notes;
        const assigned = (p.measureAssignments || []).filter(Boolean).length;
        totalAssignedPatternMeasures += assigned;
      });

      activeStepsCount += trackActive;
      lyricsCount += trackLyrics;
      notesCount += trackNotes;

      tracksList.push({
        id: t.id,
        name: t.name || t.customName,
        customName: t.customName,
        instrumentIdx: t.instrumentIdx,
        isBus: !!t.isBusFolder,
        busId: t.busId,
        patternsCount: t.patterns?.length || 0,
        activeSteps: trackActive,
        lyrics: trackLyrics,
        notes: trackNotes
      });
    });

    return {
      format: 'v3_tracks',
      name: data.name || data.metadata?.toada,
      bpm: data.bpm,
      totalMeasures: data.totalMeasures || (data.measureBpms ? data.measureBpms.length : 0),
      tracksCount: data.tracks.length,
      activeStepsCount,
      lyricsCount,
      notesCount,
      totalAssignedPatternMeasures,
      tracks: tracksList,
      metadata: data.metadata,
      hasSignals: Array.isArray(data.measureSignals) && data.measureSignals.some(Boolean),
      raw: data
    };
  }

  return null;
}

console.log('============================================================');
console.log('🔍 ÉTAPE 1 : EXTRACTION EXHAUSTIVE DE L\'HISTORIQUE GIT');
console.log('============================================================\n');

// 1. Lister tous les commits touchant des JSON
const gitLogOutput = execSync('git log --all --name-only --pretty=format:"COMMIT:%H|%s|%cd" --date=short -- "*.json"', {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf-8'
});

const lines = gitLogOutput.split('\n');
const commits = [];
let currentCommit = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (trimmed.startsWith('COMMIT:')) {
    const parts = trimmed.substring(7).split('|');
    currentCommit = {
      hash: parts[0],
      subject: parts[1],
      date: parts[2],
      files: []
    };
    commits.push(currentCommit);
  } else if (currentCommit && trimmed.endsWith('.json')) {
    currentCommit.files.push(trimmed);
  }
}

console.log(`Nombre total de commits analysés : ${commits.length}`);

// Filtrer les fichiers pertinents
const TARGET_KEYWORDS = ['vovo', 'macaiba', 'breque', 'vadiar', 'convencao', 'opanije', 'catalog', 'preset'];
const foundHistoricalPresets = [];

for (const c of commits) {
  for (const f of c.files) {
    const lower = f.toLowerCase();
    const isTarget = TARGET_KEYWORDS.some(kw => lower.includes(kw));
    const isUnderFolder = f.startsWith('public/presets/') || f.startsWith('BaqueMix/Catalog/') || f.startsWith('fichiers sequenciador/') || f.startsWith('src/data/') || f.endsWith('presets.json');

    if (isTarget || isUnderFolder) {
      try {
        const rawContent = execSync(`git show ${c.hash}:"${f}"`, {
          maxBuffer: 50 * 1024 * 1024,
          encoding: 'utf-8'
        });
        const parsed = tryParseJson(rawContent);
        if (parsed) {
          const analysis = analyzePreset(parsed);
          if (analysis) {
            foundHistoricalPresets.push({
              commitHash: c.hash,
              commitSubject: c.subject,
              commitDate: c.date,
              filePath: f,
              analysis
            });
          }
        }
      } catch (_) {
        // Le fichier pouvait être supprimé ou binaire dans ce commit
      }
    }
  }
}

console.log(`Nombre de versions de presets exploitables extraites de Git : ${foundHistoricalPresets.length}\n`);

// =========================================================================
// 2. Scan des fichiers locaux sur le disque
// =========================================================================
console.log('============================================================');
console.log('🔍 ÉTAPE 2 : SCAN DES SAUVEGARDES LOCALES SUR LE DISQUE');
console.log('============================================================\n');

const localPathsToScan = [
  'recup-opanije-43mesures.json',
  '../tem_macaiba.json',
  'tem_macaiba.json',
  '../fichiers sequenciador/convencao_2.json',
  'fichiers sequenciador/convencao_2.json',
  'public/presets/Vou vadiar carnaval.json',
  'public/presets/_convencao_2.json',
  'public/presets/fatras.json',
  '../presets.json',
  'presets.json',
  'scripts/opanije-firestore-dump.json'
];

const foundLocalPresets = [];

for (const p of localPathsToScan) {
  if (fs.existsSync(p)) {
    try {
      const buf = fs.readFileSync(p);
      let str;
      if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        str = buf.toString('utf16le');
      } else {
        str = buf.toString('utf8');
      }
      const parsed = tryParseJson(str);
      if (parsed) {
        const analysis = analyzePreset(parsed);
        if (analysis) {
          const stat = fs.statSync(p);
          foundLocalPresets.push({
            source: 'LOCAL_DISK',
            filePath: p,
            fileSize: stat.size,
            mtime: stat.mtime.toISOString().split('T')[0],
            analysis
          });
        }
      }
    } catch (_) {}
  }
}

console.log(`Nombre de presets locaux exploitables identifiés : ${foundLocalPresets.length}\n`);

// =========================================================================
// 3. Regroupement et sélection des plus riches pour chaque morceau officiel
// =========================================================================
const OFFICIAL_PIECES = [
  { key: 'opanije', label: 'Opanijé', match: /(opanij|opanije)/i },
  { key: 'vovo', label: 'Vovó Falou', match: /(vovo|vovó)/i },
  { key: 'macaiba', label: 'Tem macaiba', match: /(macaiba|macaíba)/i },
  { key: 'breque', label: 'Breque de caixa', match: /(breque)/i },
  { key: 'vadiar', label: 'Vou vadiar carnaval', match: /(vadiar)/i },
  { key: 'convencao', label: 'Convenção 2', match: /(convenc|convention)/i }
];

const allCandidates = [
  ...foundHistoricalPresets.map(x => ({ ...x, origin: `GIT (${x.commitDate} ${x.commitHash.substring(0, 7)} - ${x.filePath})` })),
  ...foundLocalPresets.map(x => ({ ...x, origin: `DISK (${x.mtime} - ${x.filePath})` }))
];

console.log('============================================================');
console.log('🏆 ANALYSE COMPARATIVE & SÉLECTION DES VERSIONS LES PLUS RICHES');
console.log('============================================================\n');

const bestPerPiece = {};

for (const piece of OFFICIAL_PIECES) {
  const matches = allCandidates.filter(c => {
    const name = c.analysis.name || '';
    const toada = c.analysis.metadata?.toada || '';
    const pathName = c.filePath || '';
    return piece.match.test(name) || piece.match.test(toada) || piece.match.test(pathName);
  });

  console.log(`------------------------------------------------------------`);
  console.log(`🎵 Morceau : ${piece.label.toUpperCase()} (${matches.length} versions trouvées)`);
  console.log(`------------------------------------------------------------`);

  if (matches.length === 0) {
    console.log(`  ⚠️ Aucune version spécifique trouvée pour ${piece.label}.`);
    continue;
  }

  // Trier par richesse : score combiné = activeStepsCount + (lyricsCount * 2) + (notesCount * 2) + (totalMeasures * 2) + (tracksCount * 3)
  matches.sort((a, b) => {
    const scoreA = a.analysis.activeStepsCount + (a.analysis.lyricsCount * 2) + (a.analysis.notesCount * 2) + (a.analysis.totalMeasures * 2) + (a.analysis.tracksCount * 3);
    const scoreB = b.analysis.activeStepsCount + (b.analysis.lyricsCount * 2) + (b.analysis.notesCount * 2) + (b.analysis.totalMeasures * 2) + (b.analysis.tracksCount * 3);
    return scoreB - scoreA;
  });

  // Afficher le top 3
  matches.slice(0, 4).forEach((m, idx) => {
    console.log(`  [${idx + 1}] ${m.origin}`);
    console.log(`      Format: ${m.analysis.format} | Mesures: ${m.analysis.totalMeasures} | Pistes: ${m.analysis.tracksCount} | Pas actifs: ${m.analysis.activeStepsCount} | Paroles: ${m.analysis.lyricsCount} | Notes: ${m.analysis.notesCount} | BPM: ${m.analysis.bpm}`);
  });

  const best = matches[0];
  bestPerPiece[piece.key] = best;

  // Sauvegarder dans recup_presets_git
  const safeFilename = `${piece.key}_authentique_${best.commitHash ? best.commitHash.substring(0, 7) : 'disk'}.json`;
  const outPath = path.join(RECOVERY_DIR, safeFilename);
  fs.writeFileSync(outPath, JSON.stringify(best.analysis.raw, null, 2), 'utf-8');
  console.log(`  💾 Sauvegardé dans : ${outPath}\n`);
}

// Bilan récapitulatif
console.log('\n============================================================');
console.log('📋 TABLEAU RÉCAPITULATIF DE LA SÉLECTION AUTHENTIQUE :');
console.log('============================================================\n');

const summaryTable = OFFICIAL_PIECES.map(p => {
  const best = bestPerPiece[p.key];
  if (!best) {
    return {
      'Morceau': p.label,
      'Source retenue': 'Aucune version trouvée',
      'Format': '-',
      'Mesures': '-',
      'Pistes': '-',
      'Pas Actifs': '-',
      'Paroles': '-',
      'Notes': '-'
    };
  }
  return {
    'Morceau': p.label,
    'Source retenue': best.origin.substring(0, 45) + '...',
    'Format': best.analysis.format,
    'Mesures': best.analysis.totalMeasures,
    'Pistes': best.analysis.tracksCount,
    'Pas Actifs': best.analysis.activeStepsCount,
    'Paroles': best.analysis.lyricsCount,
    'Notes': best.analysis.notesCount
  };
});

console.table(summaryTable);
