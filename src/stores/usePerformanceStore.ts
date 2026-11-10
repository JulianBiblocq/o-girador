import { create } from 'zustand';
import { detectHardwareCapabilities } from '../utils/hardwareDetection';

/**
 * Store de telemetrie materielle en lecture seule (aucun drapeau de bridage).
 * Le pilotage Eco est centralise dans `projectSettingsSlice` (`isEcoMode` + `ecoConfig`).
 */
export interface PerformanceState {
  ram: number | undefined;
  cores: number | undefined;
}

const initialHardware = detectHardwareCapabilities();

export const usePerformanceStore = create<PerformanceState>(() => ({
  ram: initialHardware.ram,
  cores: initialHardware.cores,
}));
