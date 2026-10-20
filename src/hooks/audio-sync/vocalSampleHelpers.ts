import { useAudioStore } from '../../stores/useAudioStore';

export const noteToFrequency = (noteStr: string): number => {
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  
  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 261.63; // Default to C4 if invalid
  
  const pitch = match[1];
  const octave = parseInt(match[2], 10);
  
  const semitoneIndex = noteMap[pitch];
  if (semitoneIndex === undefined) return 261.63;
  
  const semitonesFromC4 = semitoneIndex + (octave - 4) * 12;
  const semitonesFromA4 = semitonesFromC4 - 9;
  
  return 440 * Math.pow(2, semitonesFromA4 / 12);
};

export const getVoiceNoteStepsFromDecay = (decay: number): number => {
  if (decay <= 10) return 1;
  if (decay <= 20) return 2;
  if (decay <= 30) return 3;
  if (decay <= 40) return 4;
  if (decay <= 50) return 5;
  if (decay <= 60) return 6;
  if (decay <= 70) return 7;
  if (decay <= 80) return 8;
  if (decay <= 90) return 12;
  return 16;
};

export const isVocalSamplePattern = (pattern: any): boolean => {
  if (!pattern) return false;
  return Boolean(
    pattern.vocalMode === 'micro' ||
    pattern.vocalMode === 'audio' ||
    pattern.vocalMode === 'recorded' ||
    pattern.vocalClip ||
    pattern.vocalAudioData ||
    pattern.vocalAudioUrl
  );
};

export const isSamplePlaybackAllowed = (currentVocalMode: string | undefined): boolean => {
  return currentVocalMode !== 'synth';
};

export const getVocalBufferForPattern = (trackId: string | number, pattern: any): AudioBuffer | undefined => {
  if (!pattern) return undefined;
  const buffers = useAudioStore.getState().vocalBuffers;
  const patId = pattern.id;
  const clipId = pattern.vocalClip?.id;

  return (
    buffers[`${trackId}_${patId}`] ||
    buffers[patId] ||
    (clipId ? buffers[`${trackId}_${clipId}`] || buffers[clipId] : undefined) ||
    (!isNaN(Number(patId)) ? buffers[`${trackId}_${Number(patId)}`] || buffers[Number(patId)] : undefined) ||
    (clipId && !isNaN(Number(clipId)) ? buffers[`${trackId}_${Number(clipId)}`] || buffers[Number(clipId)] : undefined)
  );
};
