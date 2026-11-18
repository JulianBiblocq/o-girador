/**
 * encode-studio-lot1.mjs — Encodage déterministe Studio des 92 WAV Lot 1 (Gonguê, Agbê, Mineiro, Apito) (< 130 lignes).
 * - Lecture 100 % read-only du dossier Cubase ; zéro touche aux Alfaias ni à la Caixa.
 * - Zéro normalisation fichier par fichier : un unique trim uniforme par instrument garantit True-Peak <= -0.3 dBFS.
 * - Sorties : 48 000 Hz, Mono (-ac 1), Libvorbis -q:a 8 (.ogg) + fallback iOS/Safari AAC 160k (.m4a).
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { LOT1_INSTRUMENTS, scanCubaseLot1Wavs } from './lot1WavScanner.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CUBASE_WAV_DIR = process.env.LOT1_WAV_DIR || 'E:\\Samambaia\\Som-o-girador\\Samples-o-girador';
const OUT_DIR = path.resolve(__dirname, '../public/Mixdown');
const CUBASE_FFMPEG = 'C:\\Program Files\\Steinberg\\Cubase 15\\Externals\\FFmpeg\\5.1.1\\ffmpeg.exe';

function resolveFfmpegBin() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  if (fs.existsSync(CUBASE_FFMPEG)) return CUBASE_FFMPEG;
  return 'ffmpeg';
}

async function measureEncodedFileMetrics(ffmpegBin, filePath) {
  const { stdout, stderr } = await execFileAsync(ffmpegBin, [
    '-hide_banner', '-i', filePath, '-vn', '-ac', '1', '-ar', '48000',
    '-af', 'ebur128=peak=true', '-f', 'f32le', 'pipe:1',
  ], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 });

  const n = Math.floor(stdout.length / 4);
  let maxAbs = 0, sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = stdout.readFloatLE(i * 4), a = Math.abs(v);
    if (a > maxAbs) maxAbs = a;
    sumSq += v * v;
  }
  const errTxt = stderr.toString('utf8');
  const tpMatch = errTxt.match(/True peak:\s*[\r\n]+\s*Peak:\s*([-\d.]+)\s*dBFS/i);
  const samplePeakDb = 20 * Math.log10(maxAbs || 1e-12);
  return {
    samplePeakDb,
    truePeakDb: tpMatch ? Number(tpMatch[1]) : samplePeakDb,
    rmsDb: 10 * Math.log10((sumSq / Math.max(1, n)) || 1e-24),
  };
}

async function encodeJob(ffmpegBin, job) {
  if (/^(Alfaia|Caixa)\b/i.test(job.baseName)) {
    throw new Error(`Sécurité déclenchée : interdiction d'écrire "${job.baseName}"`);
  }
  const oggOut = path.join(OUT_DIR, `${job.baseName}.ogg`);
  const m4aOut = path.join(OUT_DIR, `${job.baseName}.m4a`);
  const afArgs = job.trimDb !== 0 ? ['-af', `volume=${job.trimDb.toFixed(2)}dB`] : [];

  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', job.srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'libvorbis', '-q:a', '8', oggOut,
  ]);

  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', job.srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', m4aOut,
  ]);

  const measured = await measureEncodedFileMetrics(ffmpegBin, oggOut);
  job.outSamplePeakDb = measured.samplePeakDb;
  job.outTruePeakDb = measured.truePeakDb;
  job.outRmsDb = measured.rmsDb;
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const ffmpegBin = resolveFfmpegBin();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { jobs, trimByInstrument } = scanCubaseLot1Wavs(CUBASE_WAV_DIR);
  console.log(`[studio-lot1] Scanned ${jobs.length} WAV files (read-only). Encoding .ogg (-q:a 8) + .m4a (160k) @ 48 kHz Mono...`);

  await runPool(jobs, 8, async (job) => encodeJob(ffmpegBin, job));

  console.log('\n=== Post-Encode Instrument Summary (48 kHz Mono .ogg) ===');
  for (const inst of LOT1_INSTRUMENTS) {
    const sub = jobs.filter((j) => j.inst === inst);
    const maxTp = Math.max(...sub.map((j) => j.outTruePeakDb));
    const maxSp = Math.max(...sub.map((j) => j.outSamplePeakDb));
    const meanRms = sub.reduce((s, j) => s + j.outRmsDb, 0) / sub.length;
    console.log(`  ${inst.padEnd(8)} (${String(sub.length).padStart(2)} files, trim ${trimByInstrument[inst].toFixed(1)} dB) : MaxTruePeak=${maxTp.toFixed(2)} dBTP | MaxSamplePeak=${maxSp.toFixed(2)} dBFS | MeanRMS=${meanRms.toFixed(2)} dBFS`);
    if (maxTp > -0.25) throw new Error(`True-Peak ceiling exceeded on ${inst}: ${maxTp.toFixed(2)} dBTP`);
  }

  const byGroup = new Map();
  for (const j of jobs) {
    const k = `${j.inst}:${j.targetArt}`;
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k).push(j);
  }
  console.log('\n=== Post-Encode Articulation Breakdown ===');
  for (const [k, arr] of byGroup.entries()) {
    const maxTp = Math.max(...arr.map((x) => x.outTruePeakDb)).toFixed(2);
    const meanSp = (arr.reduce((s, x) => s + x.outSamplePeakDb, 0) / arr.length).toFixed(2);
    const meanRms = (arr.reduce((s, x) => s + x.outRmsDb, 0) / arr.length).toFixed(2);
    console.log(`  ${k.padEnd(18)} n=${String(arr.length).padStart(2)} | MaxTP=${maxTp.padStart(6)} dBTP | MeanPeak=${meanSp.padStart(6)} dBFS | MeanRMS=${meanRms.padStart(6)} dBFS`);
  }
}

main().catch((err) => {
  console.error('[studio-lot1] FATAL:', err);
  process.exit(1);
});
