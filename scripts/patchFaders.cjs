const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'components');

const replacements = [
  {
    file: 'ConsoleMixer.tsx',
    patterns: [
      {
        match: /<input\s+type="range"\s+min="0"\s+max="100"\s+step="1"\s+orient="vertical"\s+value=\{metroVolume\}\s+onChange=\{\(e\) => setMetroVolume\(parseFloat\(e\.target\.value\)\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="0"\n                    max="100"\n                    step="1"\n                    orient="vertical"\n                    audioTarget="metroVolume"\n                    value={metroVolume}\n                    onChange={(val) => setMetroVolume(val)}'
      },
      {
        match: /<input\s+type="range"\s+min="-12"\s+max="12"\s+step="0\.5"\s+value=\{masterEQ\.low\}\s+onChange=\{\(e\) => onMasterEQChange\(\{ \.\.\.masterEQ, low: parseFloat\(e\.target\.value\) \}\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="-12"\n                    max="12"\n                    step="0.5"\n                    audioTarget="eqLow"\n                    value={masterEQ.low}\n                    onChange={(val) => onMasterEQChange({ ...masterEQ, low: val })}'
      },
      {
        match: /<input\s+type="range"\s+min="-12"\s+max="12"\s+step="0\.5"\s+value=\{masterEQ\.mid\}\s+onChange=\{\(e\) => onMasterEQChange\(\{ \.\.\.masterEQ, mid: parseFloat\(e\.target\.value\) \}\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="-12"\n                    max="12"\n                    step="0.5"\n                    audioTarget="eqMid"\n                    value={masterEQ.mid}\n                    onChange={(val) => onMasterEQChange({ ...masterEQ, mid: val })}'
      },
      {
        match: /<input\s+type="range"\s+min="-12"\s+max="12"\s+step="0\.5"\s+value=\{masterEQ\.high\}\s+onChange=\{\(e\) => onMasterEQChange\(\{ \.\.\.masterEQ, high: parseFloat\(e\.target\.value\) \}\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="-12"\n                    max="12"\n                    step="0.5"\n                    audioTarget="eqHigh"\n                    value={masterEQ.high}\n                    onChange={(val) => onMasterEQChange({ ...masterEQ, high: val })}'
      },
      {
        match: /<input\s+type="range"\s+min="-60"\s+max="0"\s+step="1"\s+value=\{masterCompressor\.threshold\}\s+onChange=\{\(e\) => onMasterCompressorChange\(\{ \.\.\.masterCompressor, threshold: parseFloat\(e\.target\.value\) \}\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="-60"\n                    max="0"\n                    step="1"\n                    audioTarget="compThreshold"\n                    value={masterCompressor.threshold}\n                    onChange={(val) => onMasterCompressorChange({ ...masterCompressor, threshold: val })}'
      },
      {
        match: /<input\s+type="range"\s+min="1"\s+max="20"\s+step="0\.5"\s+value=\{masterCompressor\.ratio\}\s+onChange=\{\(e\) => onMasterCompressorChange\(\{ \.\.\.masterCompressor, ratio: parseFloat\(e\.target\.value\) \}\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="1"\n                    max="20"\n                    step="0.5"\n                    audioTarget="compRatio"\n                    value={masterCompressor.ratio}\n                    onChange={(val) => onMasterCompressorChange({ ...masterCompressor, ratio: val })}'
      },
      {
        match: /<input\s+type="range"\s+min="-40"\s+max="6"\s+step="0\.5"\s+orient="vertical"\s+value=\{masterVol\}\s+onChange=\{\(e\) => onMasterVolChange\(parseFloat\(e\.target\.value\)\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="-40"\n                    max="6"\n                    step="0.5"\n                    orient="vertical"\n                    audioTarget="masterVolume"\n                    value={masterVol}\n                    onChange={(val) => onMasterVolChange(val)}'
      }
    ],
    addImport: "import { AudioFader } from './AudioFader';"
  },
  {
    file: 'Header.tsx',
    patterns: [
      {
        match: /<input\s+type="range"\s+min="-40"\s+max="6"\s+step="0\.5"\s+value=\{masterVol\}\s+onChange=\{\(e\) => onMasterVolChange\(parseFloat\(e\.target\.value\)\)\}/s,
        replace: '<AudioFader\n                    type="range"\n                    min="-40"\n                    max="6"\n                    step="0.5"\n                    audioTarget="masterVolume"\n                    value={masterVol}\n                    onChange={(val) => onMasterVolChange(val)}'
      }
    ],
    addImport: "import { AudioFader } from './AudioFader';"
  },
  {
    file: 'InstrumentDetailEditor.tsx',
    patterns: [
      {
        match: /<input\s+type="range"\s+min="0"\s+max="120"\s+value=\{track\.volumeVal\}\s+onChange=\{\(e\) => onVolumeChange\(parseInt\(e\.target\.value\)\)\}/s,
        replace: '<AudioFader\n              type="range"\n              min="0"\n              max="120"\n              audioTarget="trackVolume"\n              trackId={track.id}\n              value={track.volumeVal}\n              onChange={(val) => onVolumeChange(val)}'
      },
      {
        match: /<input\s+type="range"\s+min="-200"\s+max="200"\s+value=\{vocalLatency\}\s+onChange=\{\(e\) => onVocalLatencyChange \&\& onVocalLatencyChange\(ptn\.id, parseInt\(e\.target\.value\) \|\| 0\)\}/s,
        replace: '<input\n                                  type="range"\n                                  min="-200"\n                                  max="200"\n                                  value={vocalLatency}\n                                  onChange={(e) => onVocalLatencyChange && onVocalLatencyChange(ptn.id, parseInt(e.target.value) || 0)}' 
      }, // No change for vocal latency (not audio engine node)
      {
        match: /<input\s+type="range"\s+min="0"\s+max="100"\s+value=\{stepMicrotiming\}\s+onChange=\{\(e\) => onStepMicrotimingChange\(ptn\.id, i, parseInt\(e\.target\.value\)\)\}/s,
        replace: '<input type="range" min="0" max="100" value={stepMicrotiming} onChange={(e) => onStepMicrotimingChange(ptn.id, i, parseInt(e.target.value))}'
      }, // No change for microtiming
      {
        match: /<input\s+type="range"\s+min="1"\s+max="100"\s+value=\{stepDecay\}\s+onChange=\{\(e\) => onStepDecayChange\(ptn\.id, i, parseInt\(e\.target\.value\)\)\}/s,
        replace: '<input type="range" min="1" max="100" value={stepDecay} onChange={(e) => onStepDecayChange(ptn.id, i, parseInt(e.target.value))}'
      }, // No change for decay
      {
        match: /<input\s+type="range"\s+min="0"\s+max="100"\s+value=\{stepVolume\}\s+onChange=\{\(e\) => onStepVolumeChange\(ptn\.id, i, parseInt\(e\.target\.value\)\)\}/s,
        replace: '<input type="range" min="0" max="100" value={stepVolume} onChange={(e) => onStepVolumeChange(ptn.id, i, parseInt(e.target.value))}'
      } // No change for step volume (not global track volume node)
    ],
    addImport: "import { AudioFader } from './AudioFader';"
  }
];

replacements.forEach(({ file, patterns, addImport }) => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    patterns.forEach(p => {
      if (content.match(p.match) && p.match.toString() !== '/<input\\s+type="range"\\s+min="-200"\\s+max="200"\\s+value=\\{vocalLatency\\}\\s+onChange=\\{\\(e\\) => onVocalLatencyChange \\&\\& onVocalLatencyChange\\(ptn\\.id, parseInt\\(e\\.target\\.value\\) \\|\\| 0\\)\\}/s') {
        content = content.replace(p.match, p.replace);
        changed = true;
      }
    });
    if (changed) {
      if (addImport && !content.includes("import { AudioFader }")) {
        // Insert after first line
        const lines = content.split('\n');
        lines.splice(1, 0, addImport);
        content = lines.join('\n');
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Patched ${file}`);
    }
  }
});
