import * as Tone from 'tone';
import { useSequencerStore } from './stores/useSequencerStore';

if (typeof window !== 'undefined') {
  (window as any).Tone = Tone;
  (window as any).useSequencerStore = useSequencerStore;
}

export const loadTone = async () => {
  return Tone;
};

export const getTone = () => {
  return Tone;
};
