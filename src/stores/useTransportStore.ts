import { create } from 'zustand';
import { GlobalSwing } from '../types';

export interface TransportState {
  isMetroOn: boolean;
  metroVolume: number;
  metroSound: 'synth' | 'clave' | 'cowbell';
  globalSwing: GlobalSwing;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;

  setIsMetroOn: (isMetroOn: boolean) => void;
  setMetroVolume: (metroVolume: number) => void;
  setMetroSound: (metroSound: 'synth' | 'clave' | 'cowbell') => void;
  setGlobalSwing: (globalSwing: GlobalSwing) => void;
  setSoloPatternPlayId: (soloPatternPlayId: number | null) => void;
  setSoloPatternVariationId: (soloPatternVariationId: string | null) => void;
}

export const useTransportStore = create<TransportState>((set) => ({
  isMetroOn: false,
  metroVolume: 80,
  metroSound: 'synth',
  globalSwing: { mode: 'maracatu', customOffsets: [0, 8, -29, -58] },
  soloPatternPlayId: null,
  soloPatternVariationId: null,

  setIsMetroOn: (isMetroOn) => set({ isMetroOn }),
  setMetroVolume: (metroVolume) => set({ metroVolume: Math.max(0, Math.min(100, metroVolume)) }),
  setMetroSound: (metroSound) => set({ metroSound }),
  setGlobalSwing: (globalSwing) => set({ globalSwing }),
  setSoloPatternPlayId: (soloPatternPlayId) => set({ soloPatternPlayId }),
  setSoloPatternVariationId: (soloPatternVariationId) => set({ soloPatternVariationId }),
}));
