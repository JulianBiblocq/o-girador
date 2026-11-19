/**
 * caixaWavScanner.mjs — Scan 100 % lecture seule des 52 WAV Cubase Studio `Caixa` (< 110 lignes).
 * - Zéro écrasement de la banque provisoire Legacy (`public/Mixdown/Caixa *.ogg`) grâce au préfixe dédié `Caixa studio`.
 * - Nomenclature NTFS sans collision de casse (`f_min d`, `f_min e`, `r_min` sur toutes les prises `*-01.wav`).
 * - Gain uniforme unique (`-0.8 dB`, 0 normalisation fichier par fichier) garantissant True-Peak <= -0.3 dBTP post-codec.
 */
import fs from 'fs';
import path from 'path';
import { measureWavBuffer } from './lot1WavScanner.mjs';

export const CAIXA_UNIFORM_TRIM_DB = -0.8;

const CAIXA_RULES = [
  { art: 'F D', expected: 6, single: false, re: /^Caixa F D (\d+)\.wav$/u },
  { art: 'f_min d', expected: 6, single: false, re: /^Caixa f d (\d+)-01\.wav$/u },
  { art: 'F E', expected: 6, single: false, re: /^Caixa F E (\d+)\.wav$/u },
  { art: 'f_min e', expected: 6, single: false, re: /^Caixa f e (\d+)-01\.wav$/u },
  { art: 'A', expected: 5, single: false, re: /^Caixa A (\d+)\.wav$/u },
  { art: 'R', expected: 5, single: false, re: /^Caixa R (\d+)\.wav$/u },
  { art: 'r_min', expected: 5, single: false, re: /^Caixa r (\d+)-01\.wav$/u },
  { art: 'F', expected: 4, single: false, re: /^Caixa F (\d+)\.wav$/u },
  { art: 'X', expected: 4, single: false, re: /^Caixa X (\d+)\.wav$/u },
  { art: 'C', expected: 4, single: false, re: /^Caixa C (\d+)\.wav$/u },
  { art: 'B', expected: 1, single: true, re: /^Caixa B (\d+)\.wav$/u },
];

export function scanCubaseCaixaWavs(sourceDir) {
  const entries = fs
    .readdirSync(sourceDir)
    .filter((f) => /^Caixa\b.*\.wav$/iu.test(f))
    .sort();

  const jobs = [];
  const lowerNames = new Set();

  for (const rule of CAIXA_RULES) {
    const matched = [];
    for (const fileName of entries) {
      const m = fileName.match(rule.re);
      if (m) matched.push({ fileName, srcIdx: Number(m[1]) });
    }
    matched.sort((a, b) => a.srcIdx - b.srcIdx);
    if (matched.length !== rule.expected) {
      throw new Error(`Série Caixa "${rule.art}" : attendu ${rule.expected} fichiers, trouvé ${matched.length}`);
    }

    matched.forEach((item, idx) => {
      const seqNum = idx + 1;
      const baseName = rule.single
        ? `Caixa studio ${rule.art}`
        : `Caixa studio ${rule.art} ${seqNum}`;
      const lowerKey = baseName.toLowerCase();
      if (lowerNames.has(lowerKey)) {
        throw new Error(`Collision NTFS détectée sur "${baseName}"`);
      }
      lowerNames.add(lowerKey);

      const srcPath = path.join(sourceDir, item.fileName);
      const metrics = measureWavBuffer(fs.readFileSync(srcPath));
      jobs.push({
        inst: 'caixa',
        targetArt: rule.art,
        seqNum,
        baseName,
        fileName: item.fileName,
        srcPath,
        trimDb: CAIXA_UNIFORM_TRIM_DB,
        ...metrics,
      });
    });
  }

  if (jobs.length !== 52) {
    throw new Error(`Attendu exactement 52 WAV Caixa Studio, trouvé ${jobs.length}`);
  }
  return { jobs, uniformTrimDb: CAIXA_UNIFORM_TRIM_DB };
}
