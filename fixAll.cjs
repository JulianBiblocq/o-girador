const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAudioSync.ts', 'utf8');

// Fix ToneType TS errors
code = code.replace(/ToneType\.gainToDb/g, 'safeGetTone()!.gainToDb');
code = code.replace(/safeGetTone\(\)\?\.Transport\.bpm\.value = bpm;/g, 'const tone = safeGetTone();\n    if (tone) tone.Transport.bpm.value = bpm;');
code = code.replace(/safeGetTone\(\)\?\.Transport\.seconds = 0;/g, 'const tone = safeGetTone();\n    if (tone) tone.Transport.seconds = 0;');
code = code.replace(/if \(!safeGetTone\(\)\?\.context \|\| ToneType\.context\.state !== 'running'\) \{/g, `if (!safeGetTone()?.context || safeGetTone()!.context.state !== 'running') {`);

// Remove setContext block using robust Regex
code = code.replace(/if \(!safeGetTone\(\)\?\.context \|\| safeGetTone\(\)!\.context\.state !== 'running'\) \{\s*safeGetTone\(\)\?\.setContext\(new \(getTone\(\)\.Context\)\(\{ latencyHint: 'playback' \}\)\);\s*\}/, `// Tone context is automatically created by Tone.js; removing setContext to avoid Destination connection mismatch.`);

fs.writeFileSync('src/hooks/useAudioSync.ts', code);
console.log('Fixed useAudioSync.ts');
