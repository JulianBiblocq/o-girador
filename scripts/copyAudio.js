import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../Mixdown');
const destDir = path.resolve(__dirname, '../public/Mixdown');
const optimizerCachePath = path.resolve(destDir, '.optimizer-cache.json');
const generatedTsPath = path.resolve(__dirname, '../src/data/generatedSampleRevisions.ts');

function fnv1a32Buffer(buf, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (let i = 0; i < buf.length; i++) {
    hash ^= buf[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function toHex8(num) {
  return (num >>> 0).toString(16).padStart(8, '0');
}

try {
  fs.mkdirSync(destDir, { recursive: true });
  if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
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
    console.log(`[copyAudio] Copied ${countOgg} ogg and ${countM4a} m4a files to ${destDir}`);
  }

  const allFiles = fs.existsSync(destDir)
    ? fs.readdirSync(destDir).filter((f) => /\.(ogg|m4a)$/i.test(f)).sort((a, b) => a.localeCompare(b))
    : [];

  const fileHashes = new Map();
  const optimizerManifest = {};

  for (const file of allFiles) {
    const fullPath = path.join(destDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;
    const buf = fs.readFileSync(fullPath);
    const hashHex = toHex8(fnv1a32Buffer(buf));
    fileHashes.set(file, { size: stat.size, hashHex, rawHash: fnv1a32Buffer(buf) });
    optimizerManifest[file] = `${stat.size}_${hashHex}`;
  }

  fs.writeFileSync(optimizerCachePath, JSON.stringify(optimizerManifest, null, 2) + '\n', 'utf8');

  const canonicalStems = new Set();
  for (const file of allFiles) {
    canonicalStems.add(file.replace(/\.(ogg|m4a)$/i, ''));
  }

  const sortedStems = Array.from(canonicalStems).sort((a, b) => a.localeCompare(b));
  const pairs = [];
  for (const stem of sortedStems) {
    const oggInfo = fileHashes.get(`${stem}.ogg`);
    const m4aInfo = fileHashes.get(`${stem}.m4a`);
    let combined = 0x811c9dc5;
    if (oggInfo) combined = fnv1a32Buffer(Buffer.from(oggInfo.hashHex, 'ascii'), combined);
    if (m4aInfo) combined = fnv1a32Buffer(Buffer.from(m4aInfo.hashHex, 'ascii'), combined);
    const revHex = toHex8(combined);
    pairs.push([`Mixdown/${stem}.ogg`, revHex]);
  }

  // Garantie structurelle < 130 lignes même si la banque dépasse 1500 samples
  const maxBodyLines = 95;
  const itemsPerLine = Math.max(6, Math.ceil(pairs.length / maxBodyLines));
  const bodyLines = [];
  for (let i = 0; i < pairs.length; i += itemsPerLine) {
    const chunk = pairs.slice(i, i + itemsPerLine).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',');
    bodyLines.push(`  ${chunk},`);
  }

  const tsContent = [
    '/**',
    ' * generatedSampleRevisions.ts — Manifeste signé FNV-1a 32 bits (.ogg + .m4a combinés) (< 120 lignes).',
    ' * Généré automatiquement par scripts/copyAudio.js (predev / prebuild).',
    ' */',
    'export const GENERATED_SAMPLE_REVISIONS: Record<string, string> = {',
    ...bodyLines,
    '};',
    '',
  ].join('\n');

  fs.writeFileSync(generatedTsPath, tsContent, 'utf8');
  console.log(`[copyAudio] Generated ${pairs.length} canonical sample revisions (${bodyLines.length + 7} lines).`);
} catch (error) {
  console.error('[copyAudio] Error processing audio files:', error);
}
