import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../../Mixdown');
const destDir = path.resolve(__dirname, '../public/Mixdown');

try {
  if (fs.existsSync(srcDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    const files = fs.readdirSync(srcDir);
    let count = 0;
    
    for (const file of files) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      
      if (fs.statSync(srcFile).isFile() && file.endsWith('.ogg')) {
        fs.copyFileSync(srcFile, destFile);
        count++;
      }
    }
    console.log(`[copyAudio] Successfully copied ${count} ogg files to ${destDir}`);
  } else {
    console.warn(`[copyAudio] Source directory ${srcDir} does not exist. Skipping copy.`);
  }
} catch (error) {
  console.error('[copyAudio] Error copying audio files:', error);
}
