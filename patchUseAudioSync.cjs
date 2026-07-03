const fs = require('fs');

let content = fs.readFileSync('src/hooks/useAudioSync.ts', 'utf8');

// 1. Imports
content = content.replace(
  `import * as Tone from 'tone';`,
  `import type * as ToneType from 'tone';\nimport { loadTone, getTone } from '../ToneLoader';\n\nfunction safeTone() { try { return getTone(); } catch { return null; } }`
);

// 2. Types
const typeReplacements = [
  'Tone.Channel', 'Tone.Meter', 'Tone.Gain', 'Tone.Reverb', 'Tone.EQ3', 'Tone.Compressor', 'Tone.Synth', 'Tone.MembraneSynth', 'Tone.MetalSynth'
];
for (const tr of typeReplacements) {
  const newType = tr.replace('Tone.', 'ToneType.');
  // replace all globally
  content = content.split(tr).join(newType);
}

// 3. safeTone in simple useEffects
const effectSyncs = [
  // isMetroOn effect
  `    if (metroChannel) {
      const gain = Math.max(0.00001, metroVolume / 100);
      const db = metroVolume === 0 ? -Infinity : Tone.gainToDb(gain);`,
  // masterVol effect
  `  useEffect(() => {
    if (masterVolumeNode) {
      masterVolumeNode.gain.setValueAtTime(
        Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol),
        Tone.context.currentTime
      );
    }
  }, [masterVol]);`,
  // masterReverbVol effect
  `  useEffect(() => {
    if (masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol), 0.05);
    }`,
  // Transport BPM effect
  `  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);`,
  // Reset Destination Volume effect
  `  useEffect(() => {
    if (!isPlaying) {
      try {
        Tone.Destination.volume.setValueAtTime(0, Tone.context.currentTime);
      } catch (err) {}
    }
  }, [isPlaying]);`
];

const effectSyncsReplacements = [
  `    const Tone = safeTone();
    if (Tone && metroChannel) {
      const gain = Math.max(0.00001, metroVolume / 100);
      const db = metroVolume === 0 ? -Infinity : Tone.gainToDb(gain);`,

  `  useEffect(() => {
    const Tone = safeTone();
    if (Tone && masterVolumeNode) {
      masterVolumeNode.gain.setValueAtTime(
        Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol),
        Tone.context.currentTime
      );
    }
  }, [masterVol]);`,

  `  useEffect(() => {
    const Tone = safeTone();
    if (Tone && masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol), 0.05);
    }`,

  `  useEffect(() => {
    const Tone = safeTone();
    if (Tone) Tone.Transport.bpm.value = bpm;
  }, [bpm]);`,

  `  useEffect(() => {
    const Tone = safeTone();
    if (Tone && !isPlaying) {
      try {
        Tone.Destination.volume.setValueAtTime(0, Tone.context.currentTime);
      } catch (err) {}
    }
  }, [isPlaying]);`
];

for (let i = 0; i < effectSyncs.length; i++) {
  content = content.replace(effectSyncs[i], effectSyncsReplacements[i]);
}

// 4. initAudio async
content = content.replace(
  `  useEffect(() => {
    const initAudio = async () => {
      try {
        if (bMetroClickRef.current) return; // already initialized

      if (!masterVolumeNode) {
        if (!Tone.context || Tone.context.state !== 'running') {`,
  `  useEffect(() => {
    const initAudio = async () => {
      try {
        if (bMetroClickRef.current) return; // already initialized

      const Tone = await loadTone();
      if (!masterVolumeNode) {
        if (!Tone.context || Tone.context.state !== 'running') {`
);

// 5. schedule ticks Tone.Draw
// In the audioWorker callback
content = content.replace(
  `        audioEngine = new AudioEngine(
        rawCtx,
        (time) => {`,
  `        audioEngine = new AudioEngine(
        rawCtx,
        (time) => {
          const Tone = getTone();`
);

// wait, if I put const Tone = getTone(); inside the time callback, it overrides anything.
// Let's replace the start, pause, stop functions
content = content.replace(
  `  const handleStart = async () => {
    setIsLoading(true);
    try {
      await Tone.start();`,
  `  const handleStart = async () => {
    setIsLoading(true);
    try {
      const Tone = await loadTone();
      await Tone.start();`
);

fs.writeFileSync('src/hooks/useAudioSync.ts', content);
console.log('useAudioSync patched');
