/**
 * generate-ios-m4a.mjs — Pipeline unifié d'encodage iOS/WebKit AAC-LC 192k (.m4a) (< 138 lignes).
 * - Priorité 1 (Zéro double compression) : encode les 358 Masters .wav Studio (Alfaias 125, Caixa 52, Timbal 89,
 *   Gonguê 26, Agbê 33, Mineiro 29, Apito 4) directement depuis `Samples-o-girador` avec les mêmes filtres/gains que les .ogg.
 * - Priorité 2 (Secours 0 x 404) : pour le Tarol (16 .ogg actifs) et tout .ogg de `public/Mixdown/` sans .wav direct,
 *   génère le .m4a miroir depuis le .ogg existant.
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { scanCubaseAlfaiaWavs } from './alfaiaWavScanner.mjs';
import { scanCubaseCaixaWavs } from './caixaWavScanner.mjs';
import { scanCubaseLot1Wavs } from './lot1WavScanner.mjs';
import { scanCubaseTimbalWavs } from './timbalWavScanner.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CUBASE_WAV_DIR = process.env.STUDIO_WAV_DIR || 'E:\\Samambaia\\Som-o-girador\\Samples-o-girador';
const MIXDOWN_DIR = path.resolve(__dirname, '../public/Mixdown');
const CUBASE_FFMPEG = 'C:\\Program Files\\Steinberg\\Cubase 15\\Externals\\FFmpeg\\5.1.1\\ffmpeg.exe';

const ALFAIA_GHOST_EXTRA_TRIM_DB = {
  marcante: { d_min: -4.5, e_min: -5.5 },
  meiao: { d_min: -6.0, e_min: -5.5 },
  repique: { d_min: -7.0, e_min: -6.5 },
};
const ALFAIA_GHOST_HIGH_SHELF = 'treble=g=-2.5:f=3000';

function resolveFfmpegBin() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  if (fs.existsSync(CUBASE_FFMPEG)) return CUBASE_FFMPEG;
  return 'ffmpeg';
}

function buildAlfaiaFilterArgs(job) {
  const isGhost = job.targetArt === 'd_min' || job.targetArt === 'e_min';
  const extraDb = isGhost ? (ALFAIA_GHOST_EXTRA_TRIM_DB[job.role]?.[job.targetArt] ?? 0) : 0;
  const totalGainDb = Number((job.trimDb + extraDb).toFixed(2));
  const chain = [];
  if (isGhost) chain.push(ALFAIA_GHOST_HIGH_SHELF);
  if (totalGainDb !== 0) chain.push(`volume=${totalGainDb}dB`);
  return chain.length > 0 ? ['-af', chain.join(',')] : [];
}

function buildUniformTrimFilterArgs(trimDb) {
  return trimDb && trimDb !== 0 ? ['-af', `volume=${Number(trimDb).toFixed(2)}dB`] : [];
}

async function encodeM4aFile(ffmpegBin, srcPath, m4aOut, afArgs = []) {
  await execFileAsync(ffmpegBin, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', srcPath, '-vn', '-ac', '1', '-ar', '48000',
    ...afArgs, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', m4aOut,
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
  fs.mkdirSync(MIXDOWN_DIR, { recursive: true });

  const wavJobs = [];
  const coveredBaseNamesLower = new Set();

  if (fs.existsSync(CUBASE_WAV_DIR)) {
    const alfaia = scanCubaseAlfaiaWavs(CUBASE_WAV_DIR);
    const caixa = scanCubaseCaixaWavs(CUBASE_WAV_DIR);
    const lot1 = scanCubaseLot1Wavs(CUBASE_WAV_DIR);
    const timbal = scanCubaseTimbalWavs(CUBASE_WAV_DIR);

    for (const j of alfaia.jobs) wavJobs.push({ group: `alfaia:${j.role}`, baseName: j.baseName, srcPath: j.srcPath, afArgs: buildAlfaiaFilterArgs(j) });
    for (const j of caixa.jobs) wavJobs.push({ group: 'caixa', baseName: j.baseName, srcPath: j.srcPath, afArgs: buildUniformTrimFilterArgs(j.trimDb) });
    for (const j of lot1.jobs) wavJobs.push({ group: j.inst, baseName: j.baseName, srcPath: j.srcPath, afArgs: buildUniformTrimFilterArgs(j.trimDb) });
    for (const j of timbal.jobs) wavJobs.push({ group: 'timbal', baseName: j.baseName, srcPath: j.srcPath, afArgs: buildUniformTrimFilterArgs(j.trimDb) });

    for (const j of wavJobs) coveredBaseNamesLower.add(j.baseName.toLowerCase());
  } else {
    console.warn(`[ios-m4a] Master WAV dir not found (${CUBASE_WAV_DIR}), falling back to .ogg mirrors only.`);
  }

  console.log(`[ios-m4a] Priority 1 — Encoding ${wavJobs.length} .m4a (AAC-LC 48 kHz mono 192k) directly from Master .wav...`);
  await runPool(wavJobs, 8, async (j) => {
    await encodeM4aFile(ffmpegBin, j.srcPath, path.join(MIXDOWN_DIR, `${j.baseName}.m4a`), j.afArgs);
  });

  const oggFiles = fs.readdirSync(MIXDOWN_DIR).filter((f) => f.toLowerCase().endsWith('.ogg')).sort();
  const oggFallbackJobs = [];
  for (const oggFile of oggFiles) {
    const baseName = oggFile.slice(0, -4);
    if (coveredBaseNamesLower.has(baseName.toLowerCase())) continue;
    oggFallbackJobs.push({
      baseName,
      isTarol: /^Tarol\b/iu.test(baseName),
      srcPath: path.join(MIXDOWN_DIR, oggFile),
    });
  }

  console.log(`[ios-m4a] Priority 2 — Encoding ${oggFallbackJobs.length} fallback .m4a from existing .ogg (including Tarol)...`);
  await runPool(oggFallbackJobs, 8, async (j) => {
    await encodeM4aFile(ffmpegBin, j.srcPath, path.join(MIXDOWN_DIR, `${j.baseName}.m4a`), []);
  });

  const allAfter = fs.readdirSync(MIXDOWN_DIR);
  const m4aSet = new Set(allAfter.filter((f) => f.toLowerCase().endsWith('.m4a')).map((f) => f.slice(0, -4).toLowerCase()));
  const missing = oggFiles.filter((f) => !m4aSet.has(f.slice(0, -4).toLowerCase()));
  const tarolFallbacks = oggFallbackJobs.filter((j) => j.isTarol).length;

  console.log(`\n=== iOS .m4a Generation Report ===`);
  console.log(`  - Direct Master .wav -> .m4a (192k, 0 double compression) : ${wavJobs.length}`);
  console.log(`  - Fallback .ogg -> .m4a (Tarol active: ${tarolFallbacks}, Legacy kept: ${oggFallbackJobs.length - tarolFallbacks}) : ${oggFallbackJobs.length}`);
  console.log(`  - Total .ogg in public/Mixdown : ${oggFiles.length} | Missing .m4a mirrors : ${missing.length}`);
  if (missing.length > 0) throw new Error(`Missing .m4a mirrors: ${missing.join(', ')}`);
}

main().catch((err) => {
  console.error('[ios-m4a] FATAL:', err);
  process.exit(1);
});
