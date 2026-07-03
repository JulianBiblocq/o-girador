const fs = require('fs');
const path = require('path');

const files = [
  'src/App.tsx',
  'src/components/AudioFader.tsx',
  'src/components/AudioSlicer.tsx',
  'src/components/AudioTrackRecorder.tsx',
  'src/components/CircleSequencer.tsx',
  'src/components/DicteeEngine.tsx',
  'src/components/Home.tsx',
  'src/components/InspecteurEngine.tsx',
  'src/components/LandingPage.tsx',
  'src/components/MestreEngine.tsx',
  'src/components/RythmeLiveEngine.tsx',
  'src/components/SablierEngine.tsx',
  'src/components/TimelineSequencer.tsx',
  'src/components/TrackMixer.tsx',
  'src/components/VerticalTrackMixer.tsx',
  'src/hooks/useAudioTrackRecorder.ts',
  'src/hooks/useVocalRecorder.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import * as Tone from 'tone'")) continue;

  content = content.replace(
    `import * as Tone from 'tone';`,
    `import type * as ToneType from 'tone';\nimport { loadTone, getTone } from '@/src/ToneLoader';\n\nfunction safeGetTone() {\n  try { return getTone(); } catch { return null; }\n}`
  );

  // Replace types
  content = content.replace(/(:\s*|<\s*|\|\s*|as\s+)Tone\.([A-Za-z0-9_]+)/g, '$1ToneType.$2');
  content = content.replace(/Tone\.([A-Za-z0-9_]+)\s*}/g, 'ToneType.$1}');

  // Replace values
  content = content.replace(/new\s+Tone\.([A-Za-z0-9_]+)/g, 'new (getTone().$1)');
  content = content.replace(/\bTone\.([A-Za-z0-9_]+)/g, 'safeGetTone()?.$1');

  // Fix safeGetTone()?.start();
  content = content.replace(
    /await\s+safeGetTone\(\)\?\.start\(\);/g,
    `await loadTone();\n    await getTone().start();`
  );

  fs.writeFileSync(file, content);
}
console.log('UI files patched');
