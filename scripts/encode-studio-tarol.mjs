/**
 * encode-studio-tarol.mjs — Encodage déterministe non-destructif des 53 WAV Studio `Tarol` retouchés Cubase (< 120 lignes).
 * - Lecture 100 % read-only du dossier Cubase ; zéro touche aux 16 fichiers `public/Mixdown/Tarol *.ogg` Legacy.
 * - Zéro double filtrage : les 9 anciens filtres pré-Cubase ont été purgés ; seul `TAROL_EQ_FILTERS` (SSOT `tarolWavScanner.mjs`)
 *   et le trim uniforme global `-1.1 dB` sont appliqués à l'identique aux 53 `.ogg` et 53 `.m4a`.
 * - Sorties : `Tarol studio ...` en 48 000 Hz, Mono (-ac 1), Libvorbis -q:a 6 (.ogg) + AAC-LC 192k (.m4a).
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { buildTarolFilterArgs, scanCubaseTarolWavs, TAROL_EQ_FILTERS } from './tarolWavScanner.mjs';

export { TAROL_EQ_FILTERS };

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CUBASE_WAV_DIR = process.env.TAROL_WAV_DIR || 'E:\\Samambaia\\Som-o-girador\\Samples-o-girador';
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
  if (!/^Tarol studio /u.test(job.baseName)) {
    throw new Error(`Sécurité anti-écrasement Legacy : préfixe "Tarol studio " obligatoire ("${job.baseName}")`);
  }
  const oggOut = path.join(OUT_DIR, `${job.baseName}.ogg`);
  const m4aOut = path.join(OUT_DIR, `${job.baseName}.m4a`);
  const afArgs = buildTarolFilterArgs(job.trimDb);

  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', job.srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'libvorbis', '-q:a', '6', oggOut,
  ]);

  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', job.srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'aac', '-aac_coder', 'fast', '-b:a', '192k', '-movflags', '+faststart', m4aOut,
  ]);

  const oggM = await measureEncodedFileMetrics(ffmpegBin, oggOut);
  const m4aM = await measureEncodedFileMetrics(ffmpegBin, m4aOut);
  job.outOggTpDb = oggM.truePeakDb;
  job.outM4aTpDb = m4aM.truePeakDb;
  job.outSamplePeakDb = oggM.samplePeakDb;
  job.outRmsDb = oggM.rmsDb;
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) { const idx = cursor++; await worker(items[idx], idx); }
  }));
}

async function main() {
  const ffmpegBin = resolveFfmpegBin();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { jobs, uniformTrimDb } = scanCubaseTarolWavs(CUBASE_WAV_DIR);
  console.log(`[studio-tarol] Scanned ${jobs.length} WAV files (read-only, uniform trim ${uniformTrimDb.toFixed(1)} dB + ${TAROL_EQ_FILTERS.length} micro-notch filter).`);

  await runPool(jobs, 8, async (job) => encodeJob(ffmpegBin, job));

  const maxOggTp = Math.max(...jobs.map((j) => j.outOggTpDb));
  const maxM4aTp = Math.max(...jobs.map((j) => j.outM4aTpDb));
  console.log(`\n=== Post-Encode Tarol Studio Summary (${jobs.length} .ogg + ${jobs.length} .m4a) ===`);
  console.log(`  Max True-Peak .ogg : ${maxOggTp.toFixed(2)} dBTP | Max True-Peak .m4a : ${maxM4aTp.toFixed(2)} dBTP`);
  if (maxOggTp > -0.25 || maxM4aTp > -0.25) {
    throw new Error(`True-Peak ceiling exceeded: OGG=${maxOggTp.toFixed(2)} dBTP, M4A=${maxM4aTp.toFixed(2)} dBTP`);
  }

  const byArt = new Map();
  for (const j of jobs) {
    if (!byArt.has(j.targetArt)) byArt.set(j.targetArt, []);
    byArt.get(j.targetArt).push(j);
  }
  for (const [art, arr] of byArt.entries()) {
    const maxOgg = Math.max(...arr.map((x) => x.outOggTpDb)).toFixed(2);
    const maxM4a = Math.max(...arr.map((x) => x.outM4aTpDb)).toFixed(2);
    const maxSp = Math.max(...arr.map((x) => x.outSamplePeakDb)).toFixed(2);
    const meanRms = (arr.reduce((s, x) => s + x.outRmsDb, 0) / arr.length).toFixed(2);
    console.log(`  tarol:${art.padEnd(8)} n=${String(arr.length).padStart(2)} | OGG_TP=${maxOgg.padStart(6)} | M4A_TP=${maxM4a.padStart(6)} dBTP | MaxPeak=${maxSp.padStart(6)} dBFS | MeanRMS=${meanRms.padStart(6)} dBFS`);
  }
}

main().catch((err) => {
  console.error('[studio-tarol] FATAL:', err);
  process.exit(1);
});
