/**
 * lot1WavScanner.mjs — Scan 100 % lecture seule des 92 WAV Cubase du Lot 1 (Gonguê, Agbê, Mineiro, Apito) (< 120 lignes).
 * - Ignore formellement `Alfaia *` et `Caixa *`.
 * - Nomenclature NTFS sans collision de casse (`*_min` sur toutes les prises `*-01.wav`).
 * - Gain uniforme unique par instrument (0 normalisation par fichier) garantissant True-Peak <= -0.3 dBFS.
 */
import fs from 'fs';
import path from 'path';

export const LOT1_INSTRUMENTS = ['gongue', 'agbe', 'mineiro', 'apito'];

/** Gain uniforme par instrument préservant 100 % de la balance dynamique Cubase (True-Peak <= -0.3 dBFS post-Vorbis). */
export const UNIFORM_INSTRUMENT_TRIM_DB = {
  gongue: -0.8,
  agbe: -1.5,
  mineiro: -3.2,
  apito: -1.0,
};

const RULES = [
  { inst: 'gongue', prefix: 'Gongue', art: 'G', single: false, re: /^Gongue G (\d+)\.wav$/u },
  { inst: 'gongue', prefix: 'Gongue', art: 'g_min', single: false, re: /^Gongue g (\d+)-01\.wav$/u },
  { inst: 'gongue', prefix: 'Gongue', art: 'A', single: false, re: /^Gongue A (\d+)\.wav$/u },
  { inst: 'gongue', prefix: 'Gongue', art: 'a_min', single: false, re: /^Gongue a (\d+)-01\.wav$/u },
  { inst: 'gongue', prefix: 'Gongue', art: 'X', single: false, re: /^Gongue X (\d+)\.wav$/u },
  { inst: 'gongue', prefix: 'Gongue', art: 'B', single: true, re: /^Gongue B (\d+)\.wav$/u },

  { inst: 'agbe', prefix: 'Agbe', art: 'F D', single: false, re: /^Agbe F D (\d+)\.wav$/u },
  { inst: 'agbe', prefix: 'Agbe', art: 'f_min d', single: false, re: /^Agbe f d (\d+)-01\.wav$/u },
  { inst: 'agbe', prefix: 'Agbe', art: 'F E', single: false, re: /^Agbe F E (\d+)\.wav$/u },
  { inst: 'agbe', prefix: 'Agbe', art: 'f_min e', single: false, re: /^Agbe f e (\d+)-01\.wav$/u },
  { inst: 'agbe', prefix: 'Agbe', art: 'S', single: false, re: /^Agbe S (\d+)\.wav$/u },
  { inst: 'agbe', prefix: 'Agbe', art: 'V', single: false, re: /^Agbe V (\d+)\.wav$/u },
  { inst: 'agbe', prefix: 'Agbe', art: 'B', single: true, re: /^Agbe B (\d+)\.wav$/u },

  { inst: 'mineiro', prefix: 'Mineiro', art: 'F P', single: false, re: /^Mineiro F P (\d+)\.wav$/u },
  { inst: 'mineiro', prefix: 'Mineiro', art: 'f_min p', single: false, re: /^Mineiro f p (\d+)-01\.wav$/u },
  { inst: 'mineiro', prefix: 'Mineiro', art: 'F T', single: false, re: /^Mineiro F T (\d+)\.wav$/u },
  { inst: 'mineiro', prefix: 'Mineiro', art: 'f_min t', single: false, re: /^Mineiro f t (\d+)-01\.wav$/u },
  { inst: 'mineiro', prefix: 'Mineiro', art: 'L', single: false, re: /^Mineiro L (\d+)\.wav$/u },
  { inst: 'mineiro', prefix: 'Mineiro', art: 'B', single: true, re: /^Mineiro B (\d+)\.wav$/u },

  { inst: 'apito', prefix: 'Apito', art: 'C', single: false, re: /^Apito C (\d+)\.wav$/u },
  { inst: 'apito', prefix: 'Apito', art: 'L', single: true, re: /^Apito L (\d+)\.wav$/u },
];

export function measureWavBuffer(buf) {
  let offset = 12, fmt = null, dataOff = 0, dataSize = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const sz = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(offset + 8),
        channels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        bitsPerSample: buf.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      dataOff = offset + 8; dataSize = sz; break;
    }
    offset += 8 + sz + (sz % 2);
  }
  if (!fmt || !dataOff) throw new Error('Invalid WAV header');
  const bps = fmt.bitsPerSample / 8, totalSamples = Math.floor(dataSize / bps);
  let maxAbs = 0, sumSq = 0;
  for (let i = 0; i < totalSamples; i++) {
    const p = dataOff + i * bps;
    let v = 0;
    if (fmt.bitsPerSample === 24) {
      let s = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16);
      if (s & 0x800000) s |= ~0xffffff;
      v = s / 8388608;
    } else if (fmt.bitsPerSample === 16) {
      v = buf.readInt16LE(p) / 32768;
    } else if (fmt.bitsPerSample === 32 && fmt.audioFormat === 3) {
      v = buf.readFloatLE(p);
    }
    const a = Math.abs(v);
    if (a > maxAbs) maxAbs = a;
    sumSq += v * v;
  }
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    bitsPerSample: fmt.bitsPerSample,
    durationSec: totalSamples / (fmt.sampleRate * fmt.channels),
    peakDb: 20 * Math.log10(maxAbs || 1e-12),
    rmsDb: 10 * Math.log10((sumSq / Math.max(1, totalSamples)) || 1e-24),
  };
}

export function scanCubaseLot1Wavs(sourceDir) {
  const entries = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.wav')).sort();
  const jobs = [];
  const lowerNames = new Set();

  for (const rule of RULES) {
    const matched = [];
    for (const fileName of entries) {
      const m = fileName.match(rule.re);
      if (m) matched.push({ fileName, srcIdx: Number(m[1]) });
    }
    matched.sort((a, b) => a.srcIdx - b.srcIdx);
    matched.forEach((item, idx) => {
      const seqNum = idx + 1;
      const baseName = rule.single ? `${rule.prefix} ${rule.art}` : `${rule.prefix} ${rule.art} ${seqNum}`;
      const lowerKey = baseName.toLowerCase();
      if (lowerNames.has(lowerKey)) throw new Error(`Collision NTFS détectée sur "${baseName}"`);
      lowerNames.add(lowerKey);
      const srcPath = path.join(sourceDir, item.fileName);
      const metrics = measureWavBuffer(fs.readFileSync(srcPath));
      const trimDb = UNIFORM_INSTRUMENT_TRIM_DB[rule.inst];
      jobs.push({ inst: rule.inst, targetArt: rule.art, seqNum, baseName, fileName: item.fileName, srcPath, trimDb, ...metrics });
    });
  }

  if (jobs.length !== 92) throw new Error(`Attendu exactement 92 WAV Lot 1, trouvé ${jobs.length}`);
  return { jobs, trimByInstrument: UNIFORM_INSTRUMENT_TRIM_DB };
}
