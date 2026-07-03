const fs = require('fs');

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/ToneType\.(gainToDb|dbToGain)/g, 'safeGetTone()!.$1');
  content = content.replace(
    /safeGetTone\(\)\?\.(Transport\.[a-zA-Z0-9_.]+)\s*=\s*([^;]+);/g,
    'if (safeGetTone()) safeGetTone()!.$1 = $2;'
  );
  fs.writeFileSync(file, content);
}

[
  'src/components/AudioFader.tsx',
  'src/components/DicteeEngine.tsx',
  'src/components/InspecteurEngine.tsx',
  'src/components/RythmeLiveEngine.tsx',
  'src/components/SablierEngine.tsx',
  'src/hooks/useVocalRecorder.ts'
].forEach(patchFile);
console.log('Fixed assignment errors');
