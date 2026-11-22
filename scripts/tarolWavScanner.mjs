/**
 * tarolWavScanner.mjs — Scan 100 % lecture seule des 53 WAV Cubase Studio `Tarol` (< 95 lignes).
 * - Zéro écrasement de la banque provisoire Legacy (`public/Mixdown/Tarol *.ogg`) grâce au préfixe dédié `Tarol studio`.
 * - Exclut le reliquat orphelin `Tarol f_min e 1.wav` (export antérieur du 21/11, 588 ms) pour ne retenir que
 *   les 6 nouvelles prises retouchées `Tarol f_min e 2..7.wav` (export Cubase du 22/11, 749 ms -> `1..6`).
 * - Gain uniforme global (`-1.1 dB`, 0 normalisation individuelle) garantissant True-Peak <= -0.25 dBTP post-codec.
 */
import fs from 'fs';
import path from 'path';
import { measureWavBuffer } from './lot1WavScanner.mjs';

export const TAROL_UNIFORM_TRIM_DB = -1.1;

/**
 * Unique micro-notch chirurgical post-Cubase (Cas B minimal, 0 dip large) :
 * - Cubase a déjà calmé 585, 724, 889 et 1320..1600 Hz de -9 à -10.4 dB.
 * - Seul le 4e partiel ultra-étroit à 1173 Hz (-1.6 st : 1070 Hz, Q ~ 114..200, +19.8 dB global / +32.7 dB sur F D & F E,
 *   AtkProm = -0.05 dB) dépassait encore : micro-notch Q=12, -3.5 dB alignant la queue à -65 dBFS sans toucher l'attaque.
 */
export const TAROL_EQ_FILTERS = [
  'equalizer=f=1173:t=q:w=12:g=-3.5',
];

const TAROL_RULES = [
  { art: 'F D', expected: 6, re: /^Tarol F D (\d+)\.wav$/u },
  { art: 'F E', expected: 6, re: /^Tarol F E (\d+)\.wav$/u },
  { art: 'f_min d', expected: 6, re: /^Tarol f_min d (\d+)\.wav$/u },
  { art: 'f_min e', expected: 6, re: /^Tarol f_min e ([2-7])\.wav$/u },
  { art: 'A', expected: 5, re: /^Tarol A (\d+)\.wav$/u },
  { art: 'R', expected: 5, re: /^Tarol R (\d+)\.wav$/u },
  { art: 'r_min', expected: 5, re: /^Tarol r_min (\d+)\.wav$/u },
  { art: 'F', expected: 5, re: /^Tarol F (\d+)\.wav$/u },
  { art: 'X', expected: 4, re: /^Tarol X (\d+)\.wav$/u },
  { art: 'C', expected: 4, re: /^Tarol C (\d+)\.wav$/u },
  { art: 'B', expected: 1, re: /^Tarol B (\d+)\.wav$/u },
];

export function buildTarolFilterArgs(trimDb = TAROL_UNIFORM_TRIM_DB) {
  const chain = [
    'aformat=sample_fmts=dbl',
    ...TAROL_EQ_FILTERS,
    ...(trimDb && trimDb !== 0 ? [`volume=${Number(trimDb).toFixed(2)}dB`] : []),
  ];
  return ['-af', chain.join(',')];
}

export function scanCubaseTarolWavs(sourceDir) {
  const entries = fs
    .readdirSync(sourceDir)
    .filter((f) => /^Tarol\b.*\.wav$/iu.test(f))
    .sort();

  const jobs = [];
  const lowerNames = new Set();

  for (const rule of TAROL_RULES) {
    const matched = [];
    for (const fileName of entries) {
      const m = fileName.match(rule.re);
      if (m) matched.push({ fileName, srcIdx: Number(m[1]) });
    }
    matched.sort((a, b) => a.srcIdx - b.srcIdx);
    if (matched.length !== rule.expected) {
      throw new Error(`Série Tarol "${rule.art}" : attendu ${rule.expected} fichiers, trouvé ${matched.length}`);
    }

    matched.forEach((item, idx) => {
      const seqNum = idx + 1;
      const baseName = `Tarol studio ${rule.art} ${seqNum}`;
      const lowerKey = baseName.toLowerCase();
      if (lowerNames.has(lowerKey)) {
        throw new Error(`Collision NTFS détectée sur "${baseName}"`);
      }
      lowerNames.add(lowerKey);

      const srcPath = path.join(sourceDir, item.fileName);
      const metrics = measureWavBuffer(fs.readFileSync(srcPath));
      jobs.push({
        inst: 'tarol',
        targetArt: rule.art,
        seqNum,
        baseName,
        fileName: item.fileName,
        srcPath,
        trimDb: TAROL_UNIFORM_TRIM_DB,
        ...metrics,
      });
    });
  }

  if (jobs.length !== 53) {
    throw new Error(`Attendu exactement 53 WAV Tarol Studio, trouvé ${jobs.length}`);
  }
  return { jobs, uniformTrimDb: TAROL_UNIFORM_TRIM_DB };
}
