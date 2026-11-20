/**
 * timbalWavScanner.mjs — Scan 100 % lecture seule des 89 WAV Cubase Studio `Timbal` (< 90 lignes).
 * - Zéro écrasement de la banque provisoire Legacy (`public/Mixdown/Timbal *.ogg`) grâce au préfixe dédié `Timbal studio`.
 * - 16 séries exactes : G D/E, A D/E, S D/E, T D/E, D D/E, P D/E (x6), F (x6), V (x6), C (x4), B 1 (x1).
 * - Gain uniforme unique (`-1.0 dB`, 0 normalisation fichier par fichier) garantissant True-Peak <= -0.3 dBTP post-codec.
 */
import fs from 'fs';
import path from 'path';
import { measureWavBuffer } from './lot1WavScanner.mjs';

export const TIMBAL_UNIFORM_TRIM_DB = -1.0;

const TIMBAL_RULES = [
  { art: 'G D', expected: 6, re: /^Timbal G D (\d+)\.wav$/u },
  { art: 'G E', expected: 6, re: /^Timbal G E (\d+)\.wav$/u },
  { art: 'A D', expected: 6, re: /^Timbal A D (\d+)\.wav$/u },
  { art: 'A E', expected: 6, re: /^Timbal A E (\d+)\.wav$/u },
  { art: 'S D', expected: 6, re: /^Timbal S D (\d+)\.wav$/u },
  { art: 'S E', expected: 6, re: /^Timbal S E (\d+)\.wav$/u },
  { art: 'T D', expected: 6, re: /^Timbal T D (\d+)\.wav$/u },
  { art: 'T E', expected: 6, re: /^Timbal T E (\d+)\.wav$/u },
  { art: 'D D', expected: 6, re: /^Timbal D D (\d+)\.wav$/u },
  { art: 'D E', expected: 6, re: /^Timbal D E (\d+)\.wav$/u },
  { art: 'P D', expected: 6, re: /^Timbal P D (\d+)\.wav$/u },
  { art: 'P E', expected: 6, re: /^Timbal P E (\d+)\.wav$/u },
  { art: 'F', expected: 6, re: /^Timbal F (\d+)\.wav$/u },
  { art: 'V', expected: 6, re: /^Timbal V (\d+)\.wav$/u },
  { art: 'C', expected: 4, re: /^Timbal C (\d+)\.wav$/u },
  { art: 'B', expected: 1, re: /^Timbal B (\d+)\.wav$/u },
];

export function scanCubaseTimbalWavs(sourceDir) {
  const entries = fs
    .readdirSync(sourceDir)
    .filter((f) => /^Timbal\b.*\.wav$/iu.test(f))
    .sort();

  const jobs = [];
  const lowerNames = new Set();

  for (const rule of TIMBAL_RULES) {
    const matched = [];
    for (const fileName of entries) {
      const m = fileName.match(rule.re);
      if (m) matched.push({ fileName, srcIdx: Number(m[1]) });
    }
    matched.sort((a, b) => a.srcIdx - b.srcIdx);
    if (matched.length !== rule.expected) {
      throw new Error(`Série Timbal "${rule.art}" : attendu ${rule.expected} fichiers, trouvé ${matched.length}`);
    }

    matched.forEach((item, idx) => {
      const seqNum = idx + 1;
      const baseName = `Timbal studio ${rule.art} ${seqNum}`;
      const lowerKey = baseName.toLowerCase();
      if (lowerNames.has(lowerKey)) {
        throw new Error(`Collision NTFS détectée sur "${baseName}"`);
      }
      lowerNames.add(lowerKey);

      const srcPath = path.join(sourceDir, item.fileName);
      const metrics = measureWavBuffer(fs.readFileSync(srcPath));
      jobs.push({
        inst: 'timbal',
        targetArt: rule.art,
        seqNum,
        baseName,
        fileName: item.fileName,
        srcPath,
        trimDb: TIMBAL_UNIFORM_TRIM_DB,
        ...metrics,
      });
    });
  }

  if (jobs.length !== 89) {
    throw new Error(`Attendu exactement 89 WAV Timbal Studio, trouvé ${jobs.length}`);
  }
  return { jobs, uniformTrimDb: TIMBAL_UNIFORM_TRIM_DB };
}
