const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAudioSync.ts', 'utf8');

const target = `        if (!safeGetTone()?.context || safeGetTone()!.context.state !== 'running') {
          safeGetTone()?.setContext(new (getTone().Context)({ latencyHint: 'playback' }));
        }`;

content = content.replace(target, `        // Tone context is automatically created by Tone.js; removing setContext to avoid Destination connection mismatch.`);

fs.writeFileSync('src/hooks/useAudioSync.ts', content);
