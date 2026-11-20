/**
 * measure-studio-pitches.mjs — CLI permanent d'analyse spectrale haute précision (f0) en lecture seule (< 140 lignes).
 * Usage : node scripts/measure-studio-pitches.mjs [dossierWavOuOgg] [--json]
 * - Ignore le transitoire d'impact initial (0..55 ms sur Alfaias, 0..35/45 ms sur fûts courts / cloches).
 * - FFT Radix-2 zero-paddée (N = 524288 -> df = 0.0915 Hz @ 48 kHz) + fenêtre Blackman-Harris 4 termes.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CUBASE_FFMPEG = 'C:\\Program Files\\Steinberg\\Cubase 15\\Externals\\FFmpeg\\5.1.1\\ffmpeg.exe';
const FFMPEG = fs.existsSync(CUBASE_FFMPEG) ? CUBASE_FFMPEG : 'ffmpeg';

const GROUP_RULES = [
  { id: 'marcante', re: /^Alfaia\s+marcante\s+(?:F\s+)?[DE]\s+\d+\.(wav|ogg)$/iu, fMin: 38, fMax: 180, w0: 60, w1: 380 },
  { id: 'meiao', re: /^Alfaia\s+meiao\s+(?:F\s+)?[DE]\s+\d+\.(wav|ogg)$/iu, fMin: 38, fMax: 180, w0: 60, w1: 380 },
  { id: 'repique', re: /^Alfaia\s+repique\s+(?:F\s+)?[DE]\s+\d+\.(wav|ogg)$/iu, fMin: 38, fMax: 180, w0: 60, w1: 380 },
  { id: 'caixa', re: /^Caixa(?:\s+studio)?\s+(?:F(?:\s+[DE])?|[DE])\s+\d+\.(wav|ogg)$/u, fMin: 110, fMax: 320, w0: 40, w1: 280 },
  { id: 'tarol', re: /^Tarol\s+(?:F|[DE])\s*\d+\.(wav|ogg)$/u, fMin: 130, fMax: 380, w0: 35, w1: 240 },
  { id: 'timbal_A', re: /^Timbal(?:\s+studio)?\s+A(?:\s+[DE])?\s+\d+\.(wav|ogg)$/u, fMin: 120, fMax: 360, w0: 45, w1: 300 },
  { id: 'timbal_T', re: /^Timbal(?:\s+studio)?\s+T(?:\s+[DE])?\s+\d+\.(wav|ogg)$/u, fMin: 150, fMax: 900, w0: 20, w1: 200 },
  { id: 'timbal_G', re: /^Timbal(?:\s+studio)?\s+G(?:\s+[DE])?\s+\d+\.(wav|ogg)$/u, fMin: 55, fMax: 165, w0: 50, w1: 340 },
  { id: 'gongue_G', re: /^Gongue\s+G\s+\d+\.(wav|ogg)$/u, fMin: 250, fMax: 900, w0: 45, w1: 360 },
  { id: 'gongue_A', re: /^Gongue\s+A\s+\d+\.(wav|ogg)$/u, fMin: 250, fMax: 900, w0: 45, w1: 360 },
];

function decodeMonoSamples(filePath) {
  if (filePath.toLowerCase().endsWith('.wav')) {
    const buf = fs.readFileSync(filePath);
    let off = 12, fmt = null, dataOff = 0, dataSz = 0;
    while (off + 8 <= buf.length) {
      const id = buf.toString('ascii', off, off + 4), sz = buf.readUInt32LE(off + 4);
      if (id === 'fmt ') fmt = { af: buf.readUInt16LE(off + 8), ch: buf.readUInt16LE(off + 10), sr: buf.readUInt32LE(off + 12), bps: buf.readUInt16LE(off + 22) };
      else if (id === 'data') { dataOff = off + 8; dataSz = sz; break; }
      off += 8 + sz + (sz % 2);
    }
    if (!fmt || !dataOff) throw new Error(`Invalid WAV: ${filePath}`);
    const bytes = fmt.bps / 8, frameSz = bytes * fmt.ch, frames = Math.floor(Math.min(dataSz, buf.length - dataOff) / frameSz);
    const mono = new Float64Array(frames);
    for (let i = 0; i < frames; i++) {
      let s = 0;
      for (let c = 0; c < fmt.ch; c++) {
        const p = dataOff + i * frameSz + c * bytes;
        if (fmt.bps === 24) { let v = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16); if (v & 0x800000) v |= ~0xffffff; s += v / 8388608; }
        else if (fmt.bps === 16) s += buf.readInt16LE(p) / 32768;
        else s += fmt.af === 3 ? buf.readFloatLE(p) : buf.readInt32LE(p) / 2147483648;
      }
      mono[i] = s / fmt.ch;
    }
    return { samples: mono, sr: fmt.sr };
  }
  const raw = execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', filePath, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], { maxBuffer: 64 * 1024 * 1024 });
  const n = Math.floor(raw.length / 4), mono = new Float64Array(n);
  for (let i = 0; i < n; i++) mono[i] = raw.readFloatLE(i * 4);
  return { samples: mono, sr: 48000 };
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
    const ang = (-2 * Math.PI) / len, wlenRe = Math.cos(ang), wlenIm = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm, vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm; re[i + j + half] = uRe - vRe; im[i + j + half] = uIm - vIm;
        const nwRe = wRe * wlenRe - wIm * wlenIm; wIm = wRe * wlenIm + wIm * wlenRe; wRe = nwRe;
      }
    }
  }
}

function measureFileF0(filePath, rule) {
  const { samples, sr } = decodeMonoSamples(filePath);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > peak) peak = Math.abs(samples[i]);
  let onset = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= peak * 0.12) { onset = i; break; }
  const s0 = onset + Math.round((rule.w0 / 1000) * sr), s1 = Math.min(samples.length, onset + Math.round((rule.w1 / 1000) * sr));
  const M = s1 - s0;
  if (M < Math.round(0.06 * sr)) return null;
  let mean = 0;
  for (let i = 0; i < M; i++) mean += samples[s0 + i];
  mean /= M;
  const N = 524288, re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < M; i++) {
    const ph = (2 * Math.PI * i) / (M - 1);
    re[i] = (samples[s0 + i] - mean) * (0.35875 - 0.48829 * Math.cos(ph) + 0.14128 * Math.cos(2 * ph) - 0.01168 * Math.cos(3 * ph));
  }
  radix2Fft(re, im);
  const kMin = Math.max(2, Math.floor((rule.fMin * N) / sr)), kMax = Math.ceil((rule.fMax * N) / sr);
  let bestK = kMin, bestMag = -1;
  for (let k = kMin; k <= kMax; k++) {
    const m = Math.hypot(re[k], im[k]);
    if (m > bestMag) { bestMag = m; bestK = k; }
  }
  const a = Math.log(Math.hypot(re[bestK - 1], im[bestK - 1]) + 1e-18), b = Math.log(bestMag + 1e-18), g = Math.log(Math.hypot(re[bestK + 1], im[bestK + 1]) + 1e-18);
  const denom = a - 2 * b + g;
  const delta = Math.abs(denom) > 1e-12 ? (0.5 * (a - g)) / denom : 0;
  return ((bestK + delta) * sr) / N;
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const targetDir = path.resolve(args.find((a) => !a.startsWith('--')) || 'public/Mixdown');
const files = fs.readdirSync(targetDir).filter((f) => /\.(wav|ogg)$/iu.test(f)).sort();
const summary = {};

for (const rule of GROUP_RULES) {
  const matched = files.filter((f) => rule.re.test(f));
  if (!matched.length) continue;
  const vals = matched.map((f) => measureFileF0(path.join(targetDir, f), rule)).filter((v) => v !== null).sort((x, y) => x - y);
  if (!vals.length) continue;
  const mid = vals.length >> 1;
  const medHz = Math.round(((vals.length % 2 ? vals[mid] : 0.5 * (vals[mid - 1] + vals[mid]))) * 100) / 100;
  const exactMidi = 69 + 12 * Math.log2(medHz / 440), nearMidi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - nearMidi) * 100), idx = ((nearMidi % 12) + 12) % 12, oct = Math.floor(nearMidi / 12) - 1;
  summary[rule.id] = { count: vals.length, medianHz: medHz, minHz: Number(vals[0].toFixed(2)), maxHz: Number(vals[vals.length - 1].toFixed(2)), noteFr: `${NOTES_FR[idx]}${oct}`, noteIntl: `${NOTES_INTL[idx]}${oct}`, cents };
}

if (asJson) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`=== Analyse Spectrale Studio (${targetDir}) ===`);
  for (const [id, s] of Object.entries(summary)) {
    console.log(`  ${id.padEnd(10)} (${String(s.count).padStart(2)} prises) : f0 = ${s.medianHz.toFixed(2)} Hz [${s.minHz.toFixed(2)}..${s.maxHz.toFixed(2)}] -> ${s.noteFr} (${s.noteIntl}) ${s.cents >= 0 ? `+${s.cents}` : s.cents} cents`);
  }
}
