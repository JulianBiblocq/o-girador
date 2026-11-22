/**
 * analyze-tarol-resonances.mjs — Diagnostic spectral objectif (lecture 100 % seule) du Tarol Studio (< 140 lignes).
 * Compare attaque (0..25 ms) vs queue résonante (60..420 ms) et mesure la proéminence tonale (±1/3 oct, 350..4500 Hz)
 * en hauteur brute (0 st) et accordage Roda Do Majeur (-1.6 st, ratio 0.9117).
 * Usage : node scripts/analyze-tarol-resonances.mjs [sourceDir] [--json]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const CUBASE_WAV_DIR = process.env.TAROL_WAV_DIR || 'E:\\Samambaia\\Som-o-girador\\Samples-o-girador';
const CUBASE_FFMPEG = 'C:\\Program Files\\Steinberg\\Cubase 15\\Externals\\FFmpeg\\5.1.1\\ffmpeg.exe';
const FFMPEG = fs.existsSync(CUBASE_FFMPEG) ? CUBASE_FFMPEG : 'ffmpeg';
const RODA_RATIO = Math.pow(2, -1.6 / 12); // ~0.911722
const FFT_N = 65536;

const ART_GROUPS = [
  { art: 'F D', re: /^Tarol(?:\s+studio)?\s+F\s+D\s+\d+\.(wav|ogg)$/u },
  { art: 'F E', re: /^Tarol(?:\s+studio)?\s+F\s+E\s+\d+\.(wav|ogg)$/u },
  { art: 'f_min d', re: /^Tarol(?:\s+studio)?\s+f_min\s+d\s+\d+\.(wav|ogg)$/u },
  { art: 'f_min e', re: /^Tarol(?:\s+studio)?\s+f_min\s+e\s+\d+\.(wav|ogg)$/u },
  { art: 'A', re: /^Tarol(?:\s+studio)?\s+A\s+\d+\.(wav|ogg)$/u },
  { art: 'F', re: /^Tarol(?:\s+studio)?\s+F\s+\d+\.(wav|ogg)$/u },
  { art: 'R', re: /^Tarol(?:\s+studio)?\s+R\s+\d+\.(wav|ogg)$/u },
  { art: 'r_min', re: /^Tarol(?:\s+studio)?\s+r_min\s+\d+\.(wav|ogg)$/u },
  { art: 'B', re: /^Tarol(?:\s+studio)?\s+B\s+\d+\.(wav|ogg)$/u },
];

function decodeMono(filePath) {
  if (filePath.toLowerCase().endsWith('.wav')) {
    const buf = fs.readFileSync(filePath);
    let off = 12, fmt = null, dOff = 0, dSz = 0;
    while (off + 8 <= buf.length) {
      const id = buf.toString('ascii', off, off + 4), sz = buf.readUInt32LE(off + 4);
      if (id === 'fmt ') fmt = { af: buf.readUInt16LE(off + 8), ch: buf.readUInt16LE(off + 10), sr: buf.readUInt32LE(off + 12), bps: buf.readUInt16LE(off + 22) };
      else if (id === 'data') { dOff = off + 8; dSz = sz; break; }
      off += 8 + sz + (sz % 2);
    }
    const bytes = fmt.bps / 8, fSz = bytes * fmt.ch, frames = Math.floor(Math.min(dSz, buf.length - dOff) / fSz), out = new Float64Array(frames);
    for (let i = 0; i < frames; i++) {
      let s = 0;
      for (let c = 0; c < fmt.ch; c++) {
        const p = dOff + i * fSz + c * bytes;
        if (fmt.bps === 24) { let v = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16); if (v & 0x800000) v |= ~0xffffff; s += v / 8388608; }
        else if (fmt.bps === 16) s += buf.readInt16LE(p) / 32768;
        else s += fmt.af === 3 ? buf.readFloatLE(p) : buf.readInt32LE(p) / 2147483648;
      }
      out[i] = s / fmt.ch;
    }
    return { samples: out, sr: fmt.sr };
  }
  const raw = execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', filePath, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], { maxBuffer: 32 * 1024 * 1024 });
  const n = Math.floor(raw.length / 4), out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = raw.readFloatLE(i * 4);
  return { samples: out, sr: 48000 };
}

function radix2Fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wReStep = Math.cos(ang), wImStep = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm, vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm; re[i + j + half] = uRe - vRe; im[i + j + half] = uIm - vIm;
        const nwRe = wRe * wReStep - wIm * wImStep; wIm = wRe * wImStep + wIm * wReStep; wRe = nwRe;
      }
    }
  }
}

function computeWindowPower(samples, sr, onset, ms0, ms1) {
  const s0 = Math.min(samples.length, onset + Math.round((ms0 / 1000) * sr));
  const s1 = Math.min(samples.length, onset + Math.round((ms1 / 1000) * sr));
  const M = s1 - s0, pow = new Float64Array(FFT_N >> 1);
  if (M < 64) return pow;
  const re = new Float64Array(FFT_N), im = new Float64Array(FFT_N);
  let wSum = 0;
  for (let i = 0; i < M; i++) {
    const ph = (2 * Math.PI * i) / (M - 1);
    const w = 0.35875 - 0.48829 * Math.cos(ph) + 0.14128 * Math.cos(2 * ph) - 0.01168 * Math.cos(3 * ph);
    re[i] = samples[s0 + i] * w; wSum += w;
  }
  radix2Fft(re, im);
  const inv = 2 / Math.max(1e-12, wSum);
  for (let k = 0; k < pow.length; k++) { const m = Math.hypot(re[k], im[k]) * inv; pow[k] = m * m; }
  return pow;
}

function analyzeGroupSpectrum(atkPow, tailPow, sr) {
  const half = FFT_N >> 1, atkDb = new Float64Array(half), tailDb = new Float64Array(half), promTail = new Float64Array(half), promAtk = new Float64Array(half);
  for (let k = 1; k < half; k++) { atkDb[k] = 10 * Math.log10(atkPow[k] + 1e-24); tailDb[k] = 10 * Math.log10(tailPow[k] + 1e-24); }
  const kLo = Math.floor((350 * FFT_N) / sr), kHi = Math.ceil((4500 * FFT_N) / sr), oct = Math.pow(2, 1 / 3);
  for (let k = kLo; k <= kHi; k++) {
    const b0 = Math.max(2, Math.floor(k / oct)), b1 = Math.min(half - 2, Math.ceil(k * oct));
    const sliceT = Array.from(tailDb.subarray(b0, b1 + 1)).sort((a, b) => a - b);
    const sliceA = Array.from(atkDb.subarray(b0, b1 + 1)).sort((a, b) => a - b);
    promTail[k] = tailDb[k] - sliceT[sliceT.length >> 1];
    promAtk[k] = atkDb[k] - sliceA[sliceA.length >> 1];
  }
  const peaks = [];
  for (let k = kLo + 3; k <= kHi - 3; k++) {
    if (promTail[k] < 4.0 || tailDb[k] < tailDb[k - 1] || tailDb[k] < tailDb[k + 1]) continue;
    let isLocalMax = true;
    for (let j = Math.max(kLo, k - 22); j <= Math.min(kHi, k + 22); j++) if (tailDb[j] > tailDb[k]) { isLocalMax = false; break; }
    if (!isLocalMax) continue;
    let l = k, r = k;
    while (l > bBound(k, -60) && tailDb[l] > tailDb[k] - 3) l--;
    while (r < bBound(k, 60) && tailDb[r] > tailDb[k] - 3) r++;
    const hz0 = (k * sr) / FFT_N, bw = Math.max((sr / FFT_N) * 1.5, ((r - l) * sr) / FFT_N);
    peaks.push({ hz0: Number(hz0.toFixed(1)), hzRoda: Number((hz0 * RODA_RATIO).toFixed(1)), tailPromDb: Number(promTail[k].toFixed(2)), atkPromDb: Number(promAtk[k].toFixed(2)), tailDb: Number(tailDb[k].toFixed(2)), atkDb: Number(atkDb[k].toFixed(2)), estQ: Number((hz0 / bw).toFixed(1)) });
  }
  return peaks.sort((a, b) => b.tailPromDb - a.tailPromDb);
}
const bBound = (k, d) => Math.max(2, k + d);

const args = process.argv.slice(2), asJson = args.includes('--json');
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || CUBASE_WAV_DIR);
const rawFiles = fs.readdirSync(dir).filter((f) => /^Tarol\b.*\.(wav|ogg)$/iu.test(f)).sort();
const studioOnly = rawFiles.filter((f) => /^Tarol\s+studio\b.*\.ogg$/u.test(f));
const allFiles = studioOnly.length > 0 ? studioOnly : rawFiles;
const globalAtk = new Float64Array(FFT_N >> 1), globalTail = new Float64Array(FFT_N >> 1);
let globalN = 0, srRef = 48000;
const report = {};

for (const g of ART_GROUPS) {
  const matched = allFiles.filter((f) => g.re.test(f));
  if (!matched.length) continue;
  const gAtk = new Float64Array(FFT_N >> 1), gTail = new Float64Array(FFT_N >> 1);
  for (const f of matched) {
    const { samples, sr } = decodeMono(path.join(dir, f));
    srRef = sr;
    let pk = 0, onset = 0;
    for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > pk) pk = Math.abs(samples[i]);
    for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= pk * 0.12) { onset = i; break; }
    const pA = computeWindowPower(samples, sr, onset, 0, 25), pT = computeWindowPower(samples, sr, onset, 60, 420);
    for (let k = 0; k < gAtk.length; k++) { gAtk[k] += pA[k] / matched.length; gTail[k] += pT[k] / matched.length; globalAtk[k] += pA[k]; globalTail[k] += pT[k]; }
    globalN++;
  }
  report[g.art] = { count: matched.length, peaks: analyzeGroupSpectrum(gAtk, gTail, srRef).slice(0, 10) };
}
for (let k = 0; k < globalAtk.length; k++) { globalAtk[k] /= Math.max(1, globalN); globalTail[k] /= Math.max(1, globalN); }
const globalPeaks = analyzeGroupSpectrum(globalAtk, globalTail, srRef);

if (asJson) console.log(JSON.stringify({ dir, rodaRatio: Number(RODA_RATIO.toFixed(4)), globalPeaks: globalPeaks.slice(0, 18), groups: report }, null, 2));
else {
  console.log(`=== Diagnostic Résonances Tarol Studio (${dir}, n=${globalN}, Roda -1.6st x${RODA_RATIO.toFixed(4)}) ===`);
  console.log('\n--- PICS GLOBAUX (Queue 60..420ms vs Attaque 0..25ms, 350..4500 Hz) ---');
  for (const p of globalPeaks.slice(0, 16)) {
    console.log(`  0st=${String(p.hz0).padStart(6)} Hz | -1.6st=${String(p.hzRoda).padStart(6)} Hz | TailProm=+${p.tailPromDb.toFixed(1).padStart(4)} dB (AtkProm=${(p.atkPromDb >= 0 ? '+' : '') + p.atkPromDb.toFixed(1)} dB) | Tail=${p.tailDb.toFixed(1)} dB | Q~${p.estQ}`);
  }
  for (const [art, info] of Object.entries(report)) {
    const top = info.peaks.filter((p) => p.hz0 >= 550 && p.hz0 <= 2300).slice(0, 6).map((p) => `${p.hz0}Hz(-1.6st:${p.hzRoda}Hz, +${p.tailPromDb.toFixed(1)}dB)`).join(' | ');
    console.log(`  [${art.padEnd(7)} n=${info.count}] 550..2300Hz : ${top}`);
  }
}
