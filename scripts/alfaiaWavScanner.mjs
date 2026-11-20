/**
 * alfaiaWavScanner.mjs — Scan 100 % lecture seule des WAV Cubase des 3 Alfaias (< 130 lignes).
 * Mesure Peak/RMS dBFS, renumérote séquentiellement (1..N), valide la dynamique fort/faible
 * et calcule la protection True-Peak uniforme par fût (-1.0 dB si maxPeak > -0.8 dBFS).
 */
import fs from 'fs';
import path from 'path';

const ART_MAP = new Map([
  ['F D', 'D'],
  ['F E', 'E'],
  ['f d', 'd_min'],
  ['f e', 'e_min'],
  ['A', 'A'],
  ['X', 'X'],
  ['C', 'C'],
  ['I', 'I'],
  ['B', 'B'],
]);

function measureWavBuffer(buf) {
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

export function scanCubaseAlfaiaWavs(sourceDir) {
  const entries = fs.readdirSync(sourceDir).filter((f) => /^Alfaia\b.*\.wav$/iu.test(f)).sort();
  const grouped = new Map();
  const drumMaxPeak = { marcante: -Infinity, meiao: -Infinity, repique: -Infinity };

  for (const fileName of entries) {
    const m = fileName.match(/^Alfaia\s+(marcante|meiao|repique)\s+(.+?)\s+(\d+)(-01)?\.wav$/u);
    if (!m) throw new Error(`Nom WAV Cubase non reconnu : ${fileName}`);
    const [, role, rawArtCollapsed, rawIdx, suffix01] = m;
    const normArt = rawArtCollapsed.replace(/\s+/gu, ' ').trim();
    const targetArt = ART_MAP.get(normArt);
    if (!targetArt) throw new Error(`Articulation inconnue "${normArt}" dans ${fileName}`);
    if ((targetArt === 'D' || targetArt === 'E') && suffix01) {
      throw new Error(`Anomalie casse/suffixe : coup fort avec -01 (${fileName})`);
    }
    if ((targetArt === 'd_min' || targetArt === 'e_min') && !suffix01) {
      throw new Error(`Anomalie casse/suffixe : ghost note sans -01 (${fileName})`);
    }
    const srcPath = path.join(sourceDir, fileName);
    const metrics = measureWavBuffer(fs.readFileSync(srcPath));
    if (metrics.peakDb > drumMaxPeak[role]) drumMaxPeak[role] = metrics.peakDb;

    const key = `${role}:${targetArt}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ role, targetArt, srcIdx: Number(rawIdx), fileName, srcPath, ...metrics });
  }

  const drumTrimDb = {};
  for (const role of ['marcante', 'meiao', 'repique']) {
    drumTrimDb[role] = drumMaxPeak[role] > -0.8 ? -1.0 : 0.0;
    const mean = (art) => {
      const list = grouped.get(`${role}:${art}`) || [];
      if (!list.length) throw new Error(`Pool manquant ${role}:${art}`);
      return list.reduce((s, x) => s + x.rmsDb, 0) / list.length;
    };
    if (!(mean('d_min') < mean('D')) || !(mean('e_min') < mean('E'))) {
      throw new Error(`Inversion dynamique détectée sur ${role} (RMS faible >= RMS fort)`);
    }
  }

  const jobs = [];
  for (const [, list] of grouped.entries()) {
    list.sort((a, b) => a.srcIdx - b.srcIdx);
    list.forEach((item, idx) => {
      const seqNum = idx + 1;
      const baseName = item.targetArt === 'B'
        ? `Alfaia ${item.role} B`
        : `Alfaia ${item.role} ${item.targetArt} ${seqNum}`;
      const trimDb = drumTrimDb[item.role];
      jobs.push({ ...item, seqNum, baseName, trimDb, outPeakDb: item.peakDb + trimDb, outRmsDb: item.rmsDb + trimDb });
    });
  }
  return { jobs, drumMaxPeak, drumTrimDb, grouped };
}
