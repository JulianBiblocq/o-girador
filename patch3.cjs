const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudioSync.ts', 'utf8');

code = code.replace(
  `import * as Tone from 'tone';`,
  `import type * as ToneType from 'tone';\nimport { loadTone, getTone } from '../ToneLoader';\n\n// We provide a safe getter to prevent crashes during initial render before Tone is loaded.\nfunction safeGetTone() {\n  try { return getTone(); } catch { return null; }\n}`
);

// Replace types
code = code.replace(/(:\s*|<\s*|\|\s*|as\s+)Tone\.([A-Za-z0-9_]+)/g, '$1ToneType.$2');
// Also replace `Tone.Channel` inside `{ [id: string]: Tone.Channel }`
code = code.replace(/Tone\.([A-Za-z0-9_]+)\s*}/g, 'ToneType.$1}');

// Replace values
// Anywhere we have `Tone.something`, we replace it with `safeGetTone()?.something`.
// Except for `new Tone.X`, which becomes `new (getTone().X)` because optional chaining fails with `new`.
code = code.replace(/new\s+Tone\.([A-Za-z0-9_]+)/g, 'new (getTone().$1)');
code = code.replace(/\bTone\.([A-Za-z0-9_]+)/g, 'safeGetTone()?.$1');

// Fix `safeGetTone()?.start()` in handleStart which should await loadTone()
code = code.replace(
  `await safeGetTone()?.start();`,
  `await loadTone();\n      await getTone().start();`
);

// Fix initAudio to await loadTone
code = code.replace(
  `const initAudio = async () => {`,
  `const initAudio = async () => {\n      await loadTone();`
);

// Fix TS complain on safeGetTone()?.Destination.connect
code = code.replace(
  `safeGetTone()?.Destination.connect(masterMeterNode);`,
  `getTone().Destination.connect(masterMeterNode);`
);

fs.writeFileSync('src/hooks/useAudioSync.ts', code);
