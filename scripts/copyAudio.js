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
    
    let countOgg = 0;
    let countM4a = 0;
    
    for (const file of files) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      const stat = fs.statSync(srcFile);
      
      if (stat.isFile()) {
        if (file.endsWith('.ogg')) {
          fs.copyFileSync(srcFile, destFile);
          countOgg++;
        } else if (file.endsWith('.m4a')) {
          fs.copyFileSync(srcFile, destFile);
          countM4a++;
        }
      }
    }
    console.log(`[copyAudio] Successfully copied ${countOgg} ogg files and ${countM4a} m4a files to ${destDir}`);
  } else {
    console.warn(`[copyAudio] Source directory ${srcDir} does not exist. Skipping copy.`);
  }
} catch (error) {
  console.error('[copyAudio] Error copying audio files:', error);
}
