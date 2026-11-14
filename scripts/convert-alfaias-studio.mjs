/**
 * convert-alfaias-studio.mjs — Conversion déterministe Studio des 125 WAV Alfaia en .ogg + .m4a (< 130 lignes).
 * - Dossier Cubase lu en 100 % lecture seule.
 * - Protection True-Peak uniforme par fût (-1.0 dB constant si maxPeak > -0.8 dBFS, 0 normalisation individuelle).
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

function resolveFfmpegBin() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  if (fs.existsSync(CUBASE_FFMPEG)) return CUBASE_FFMPEG;
  return 'ffmpeg';
}

async function encodeJob(ffmpegBin, job) {
  const oggOut = path.join(OUT_DIR, `${job.baseName}.ogg`);
  const m4aOut = path.join(OUT_DIR, `${job.baseName}.m4a`);
  const afArgs = job.trimDb !== 0 ? ['-af', `volume=${job.trimDb}dB`] : [];

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

  // Nettoyage des 10 anciens fichiers Alfaia meiao F / faible obsolètes
  const obsolete = [
    ...Array.from({ length: 6 }, (_, i) => `Alfaia meiao F ${i + 1}.ogg`),
    ...Array.from({ length: 4 }, (_, i) => `Alfaia meiao faible ${i + 1}.ogg`),
  ];
  for (const oldName of obsolete) {
    const p = path.join(OUT_DIR, oldName);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Résumé acoustique par fût et articulation (niveaux post-trim -1.0 dB)
  const summary = new Map();
  for (const j of jobs) {
    const k = `${j.role}:${j.targetArt}`;
    if (!summary.has(k)) summary.set(k, []);
    summary.get(k).push(j);
  }
  console.log('\n[alfaia-studio] Post-Trim Acoustic Summary (48 kHz Mono .ogg + .m4a):');
  for (const [k, arr] of summary.entries()) {
    const minP = Math.min(...arr.map((x) => x.outPeakDb)).toFixed(2);
    const maxP = Math.max(...arr.map((x) => x.outPeakDb)).toFixed(2);
    const meanR = (arr.reduce((s, x) => s + x.outRmsDb, 0) / arr.length).toFixed(2);
    console.log(`  ${k.padEnd(15)} n=${String(arr.length).padStart(2)} | Peak=[${minP}, ${maxP}] dBFS | MeanRMS=${meanR} dBFS`);
  }
}

main().catch((err) => {
  console.error('[alfaia-studio] FATAL:', err);
  process.exit(1);
});
