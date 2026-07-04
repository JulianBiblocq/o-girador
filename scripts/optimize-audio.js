import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIR = path.resolve(__dirname, '../public/Mixdown');

function getAudioFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAudioFiles(filePath, fileList);
    } else if (/\.(ogg|wav|mp3|m4a)$/i.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function optimizeFile(filePath) {
  const ext = path.extname(filePath);
  const tempPath = path.join(path.dirname(filePath), 'temp_' + Math.random().toString(36).substring(2, 9) + ext);
  
  // Règle de performance RAM : forcer le Mono (1 canal) et diminuer la fréquence d'échantillonnage.
  // Les percussions étant mono, cela divise par deux l'empreinte mémoire vive dans le Web Audio cache.
  // Pour les basses (Alfaia/Surdo), 22.05 kHz suffit largement (gain de 75% RAM/CPU).
  // Pour le reste, 32 kHz permet de garder la brillance des aigus sans saturer le main thread au décodage.
  const fileNameOrPath = filePath.toLowerCase();
  const isBassInstrument = fileNameOrPath.includes('alfaia') || fileNameOrPath.includes('surdo');
  const targetFrequency = isBassInstrument ? 22050 : 32000;
  
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .audioFrequency(targetFrequency)
      .audioChannels(1) // Force mono (1 canal)
      .audioBitrate('64k') // Bitrate mono optimisé pour format OGG
      .output(tempPath)
      .on('end', () => {
        try {
          fs.unlinkSync(filePath);
          fs.renameSync(tempPath, filePath);
          resolve(true);
        } catch (e) {
          reject(e);
        }
      })
      .on('error', (err) => {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        reject(err);
      })
      .run();
  });
}

async function run() {
  console.log(`[AudioOptimizer] Scanning audio files in ${TARGET_DIR}...`);
  const files = getAudioFiles(TARGET_DIR);
  console.log(`[AudioOptimizer] Found ${files.length} audio files to optimize.`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    try {
      await optimizeFile(file);
      successCount++;
    } catch (err) {
      console.error(`[AudioOptimizer] Failed to optimize: ${path.basename(file)}`, err.message || err);
      failCount++;
    }
  }
  
  console.log(`[AudioOptimizer] Finished. Successfully optimized ${successCount} files. Failed: ${failCount}.`);
}

run();
