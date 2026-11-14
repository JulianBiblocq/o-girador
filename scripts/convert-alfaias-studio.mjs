/**
 * convert-alfaias-studio.mjs — Conversion déterministe Studio des 125 WAV Alfaia en .ogg + .m4a (< 138 lignes).
 * - Dossier Cubase lu en 100 % lecture seule.
 * - Protection True-Peak uniforme par fût (-1.0 dB si maxPeak > -0.8 dBFS) + étalonnage ghost notes d_min / e_min
 *   avec adoucissement High-Shelf doux (treble=g=-2.5:f=3000) avant le gain final.
 * - Sorties : Mono (-ac 1), 48 000 Hz (-ar 48000), Vorbis -q:a 6 (.ogg) + AAC 160k (.m4a).
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { scanCubaseAlfaiaWavs } from './alfaiaWavScanner.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CUBASE_WAV_DIR = process.env.ALFAIA_WAV_DIR || 'E:\\Samambaia\\Som-o-girador\\Samples-o-girador';
const OUT_DIR = path.resolve(__dirname, '../public/Mixdown');
const CUBASE_FFMPEG = 'C:\\Program Files\\Steinberg\\Cubase 15\\Externals\\FFmpeg\\5.1.1\\ffmpeg.exe';

const GHOST_EXTRA_TRIM_DB = {
  marcante: { d_min: -4.5, e_min: -5.5 },
  meiao: { d_min: -6.0, e_min: -5.5 },
  repique: { d_min: -7.0, e_min: -6.5 },
};
const GHOST_HIGH_SHELF = 'treble=g=-2.5:f=3000';

function resolveFfmpegBin() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  if (fs.existsSync(CUBASE_FFMPEG)) return CUBASE_FFMPEG;
  return 'ffmpeg';
}

function buildAudioFilterArgs(job) {
  const isGhost = job.targetArt === 'd_min' || job.targetArt === 'e_min';
  const extraDb = isGhost ? (GHOST_EXTRA_TRIM_DB[job.role]?.[job.targetArt] ?? 0) : 0;
  const totalGainDb = Number((job.trimDb + extraDb).toFixed(2));
  const chain = [];
  if (isGhost) chain.push(GHOST_HIGH_SHELF);
  if (totalGainDb !== 0) chain.push(`volume=${totalGainDb}dB`);
  return chain.length > 0 ? ['-af', chain.join(',')] : [];
}

async function measureAudioFileDb(ffmpegBin, filePath) {
  const { stdout } = await execFileAsync(ffmpegBin, [
    '-hide_banner', '-loglevel', 'error', '-i', filePath, '-vn', '-ac', '1', '-f', 'f32le', 'pipe:1',
  ], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 });
  const n = Math.floor(stdout.length / 4);
  let maxAbs = 0, sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = stdout.readFloatLE(i * 4), a = Math.abs(v);
    if (a > maxAbs) maxAbs = a;
    sumSq += v * v;
  }
  return {
    peakDb: 20 * Math.log10(maxAbs || 1e-12),
    rmsDb: 10 * Math.log10((sumSq / Math.max(1, n)) || 1e-24),
  };
}

async function encodeJob(ffmpegBin, job) {
  const oggOut = path.join(OUT_DIR, `${job.baseName}.ogg`);
  const m4aOut = path.join(OUT_DIR, `${job.baseName}.m4a`);
  const afArgs = buildAudioFilterArgs(job);

  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', job.srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'libvorbis', '-q:a', '6', oggOut,
  ]);

  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', job.srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', m4aOut,
  ]);

  const measured = await measureAudioFileDb(ffmpegBin, oggOut);
  job.outPeakDb = measured.peakDb;
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

  const { jobs, drumMaxPeak, drumTrimDb } = scanCubaseAlfaiaWavs(CUBASE_WAV_DIR);
  console.log(`[alfaia-studio] Scanned ${jobs.length} WAV files (100% read-only).`);
  for (const role of ['marcante', 'meiao', 'repique']) {
    console.log(`  - ${role.padEnd(8)}: maxPeak=${drumMaxPeak[role].toFixed(2)} dBFS -> uniformTrim=${drumTrimDb[role].toFixed(1)} dB`);
  }

  await runPool(jobs, 8, async (job) => encodeJob(ffmpegBin, job));

  const summary = new Map();
  for (const j of jobs) {
    const k = `${j.role}:${j.targetArt}`;
    if (!summary.has(k)) summary.set(k, []);
    summary.get(k).push(j);
  }
  console.log('\n[alfaia-studio] Measured Post-Encode .ogg Summary (48 kHz Mono):');
  for (const [k, arr] of summary.entries()) {
    const minP = Math.min(...arr.map((x) => x.outPeakDb)).toFixed(2);
    const maxP = Math.max(...arr.map((x) => x.outPeakDb)).toFixed(2);
    const meanP = (arr.reduce((s, x) => s + x.outPeakDb, 0) / arr.length).toFixed(2);
    const meanR = (arr.reduce((s, x) => s + x.outRmsDb, 0) / arr.length).toFixed(2);
    console.log(`  ${k.padEnd(15)} n=${String(arr.length).padStart(2)} | Peak=[${minP}, ${maxP}] (mean ${meanP}) dBFS | MeanRMS=${meanR} dBFS`);
  }
}

main().catch((err) => {
  console.error('[alfaia-studio] FATAL:', err);
  process.exit(1);
});
