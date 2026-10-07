import * as Tone from 'tone';
import { useSequencerStore } from './stores/useSequencerStore';

if (typeof window !== 'undefined') {
  (window as any).Tone = Tone;
  (window as any).useSequencerStore = useSequencerStore;
  try {
    if (Tone.context) {
      Tone.context.lookAhead = 0.25;
    }
    if (Tone.Transport) {
      (Tone.Transport as any).scheduleAheadTime = 0.25;
    }
  } catch (_) {}
}

export const loadTone = async () => {
  try {
    if (Tone.context) {
      Tone.context.lookAhead = 0.25;
    }
    if (Tone.Transport) {
      (Tone.Transport as any).scheduleAheadTime = 0.25;
    }
  } catch (_) {}
  return Tone;
};

export const getTone = () => {
  try {
    if (Tone.context && Tone.context.lookAhead !== 0.25) {
      Tone.context.lookAhead = 0.25;
    }
    if (Tone.Transport && (Tone.Transport as any).scheduleAheadTime !== 0.25) {
      (Tone.Transport as any).scheduleAheadTime = 0.25;
    }
  } catch (_) {}
  return Tone;
};
