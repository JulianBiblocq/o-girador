/**
 * encode-studio-caixa.mjs — Encodage déterministe non-destructif des 52 WAV Studio `Caixa` (< 120 lignes).
 * - Lecture 100 % read-only du dossier Cubase ; zéro touche aux 16 fichiers `public/Mixdown/Caixa *.ogg` Legacy.
 * - Zéro normalisation fichier par fichier : un unique trim uniforme (-0.8 dB) garantit True-Peak <= -0.3 dBTP.
 * - Sorties : `Caixa studio ...` en 48 000 Hz, Mono (-ac 1), Libvorbis -q:a 8 (.ogg) + AAC 160k (.m4a).
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { scanCubaseCaixaWavs } from './caixaWavScanner.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CUBASE_WAV_DIR = process.env.CAIXA_WAV_DIR || 'E:\\Samambaia\\Som-o-girador\\Samples-o-girador';
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
  if (!/^Caixa studio /u.test(job.baseName)) {
    throw new Error(`Sécurité anti-écrasement Legacy : préfixe "Caixa studio " obligatoire ("${job.baseName}")`);
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

  const oggM = await measureEncodedFileMetrics(ffmpegBin, oggOut);
  const m4aM = await measureEncodedFileMetrics(ffmpegBin, m4aOut);
  job.outOggTpDb = oggM.truePeakDb;
  job.outM4aTpDb = m4aM.truePeakDb;
  job.outSamplePeakDb = oggM.samplePeakDb;
  job.outRmsDb = oggM.rmsDb;
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
  const { jobs, uniformTrimDb } = scanCubaseCaixaWavs(CUBASE_WAV_DIR);
  console.log(`[studio-caixa] Scanned ${jobs.length} WAV files (read-only, uniform trim ${uniformTrimDb.toFixed(1)} dB). Encoding .ogg (-q:a 8) + .m4a (160k) @ 48 kHz Mono...`);

  await runPool(jobs, 8, async (job) => encodeJob(ffmpegBin, job));

  const maxOggTp = Math.max(...jobs.map((j) => j.outOggTpDb));
  const maxM4aTp = Math.max(...jobs.map((j) => j.outM4aTpDb));
  console.log(`\n=== Post-Encode Caixa Studio Summary (${jobs.length} .ogg + ${jobs.length} .m4a) ===`);
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
    const maxTp = Math.max(...arr.map((x) => Math.max(x.outOggTpDb, x.outM4aTpDb))).toFixed(2);
    const meanSp = (arr.reduce((s, x) => s + x.outSamplePeakDb, 0) / arr.length).toFixed(2);
    const meanRms = (arr.reduce((s, x) => s + x.outRmsDb, 0) / arr.length).toFixed(2);
    console.log(`  caixa:${art.padEnd(8)} n=${String(arr.length).padStart(2)} | MaxTP=${maxTp.padStart(6)} dBTP | MeanPeak=${meanSp.padStart(6)} dBFS | MeanRMS=${meanRms.padStart(6)} dBFS`);
  }
}

main().catch((err) => {
  console.error('[studio-caixa] FATAL:', err);
  process.exit(1);
});
