import { useAudioStore } from '../../stores/useAudioStore';
import { sanitizePitchHz } from '../../utils/pitchHzContract';
import {
  buildVocalRecordingCandidateKeys,
  isEligibleVocalPattern,
} from '../../audio/vocal/vocalKeyCascadeResolver';

export const noteToFrequency = (noteStr: string, referencePitchHz?: unknown): number => {
  const refHz = sanitizePitchHz(referencePitchHz);
  const defaultC4 = refHz * Math.pow(2, -9 / 12);
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };

  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return defaultC4;

  const pitch = match[1];
  const octave = parseInt(match[2], 10);
  const semitoneIndex = noteMap[pitch];
  if (semitoneIndex === undefined) return defaultC4;

  const semitonesFromC4 = semitoneIndex + (octave - 4) * 12;
  const semitonesFromA4 = semitonesFromC4 - 9;
  return refHz * Math.pow(2, semitonesFromA4 / 12);
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
  return isEligibleVocalPattern(pattern);
};

export const isSamplePlaybackAllowed = (currentVocalMode: string | undefined): boolean => {
  return currentVocalMode !== 'synth';
};

export const getVocalBufferForPattern = (trackId: string | number, pattern: any): AudioBuffer | undefined => {
  if (!pattern) return undefined;
  const buffers = useAudioStore.getState().vocalBuffers;
  const candidates = buildVocalRecordingCandidateKeys(`${trackId}_${pattern.id}`, {
    trackId,
    patternId: pattern.id,
    vocalClipId: pattern.vocalClip?.id,
  });
  for (const key of candidates) {
    const found = buffers[key];
    if (found) return found;
  }
  return undefined;
};
