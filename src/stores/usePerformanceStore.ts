/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { detectHardwareCapabilities, AudioQuality, LODLevel } from '../utils/hardwareDetection';

export type { AudioQuality, LODLevel };

export interface PerformanceState {
  ram: number | undefined;     // Quantité de mémoire vive de l'appareil (en Go)
  cores: number | undefined;   // Nombre de cœurs CPU
  currentFps: number;          // Valeur courante de frames par seconde (FPS)
  isCPUSurcharged: boolean;    // Flag de surcharge CPU dynamique
  audioQuality: AudioQuality;  // 'high' | 'medium' | 'low'
  lodLevel: LODLevel;          // Level of Detail (0 à 4)

  // Reactive LOD flags for immediate consumption
  disableCSSAnimations: boolean; // LOD >= 1: Couper les animations CSS lourdes (sauf l'aiguille)
  bypassEQ: boolean;             // LOD >= 2: Bypass propre des BiquadFilters (EQ)
  bypassReverbFX: boolean;       // LOD >= 3: Bypass propre des effets lourds (Convolution Reverb)
  reducePolyphony: boolean;      // LOD >= 4: Réduction de la polyphonie (Mute des instruments esclaves)

  // Actions
  detectAndInitHardware: () => void;
  setCPUSurcharged: (val: boolean) => void;
  setHardwareInfo: (ram: number | undefined, cores: number | undefined) => void;
  setFps: (fps: number) => void;
  setLODLevel: (level: LODLevel) => void;
  setAudioQuality: (quality: AudioQuality) => void;
}

/**
 * Store de performance centralisé et découplé du thread audio.
 * Les abonnements doivent cibler uniquement des valeurs scalaires pour respecter Zero Render Thrashing.
 */
export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  ram: undefined,
  cores: undefined,
  currentFps: 60,
  isCPUSurcharged: false,
  audioQuality: 'high',
  lodLevel: 0,

  disableCSSAnimations: false,
  bypassEQ: false,
  bypassReverbFX: false,
  reducePolyphony: false,

  detectAndInitHardware: () => {
    const info = detectHardwareCapabilities();
    set({
      ram: info.ram,
      cores: info.cores,
      audioQuality: info.recommendedQuality,
    });
    get().setLODLevel(info.initialLOD);
  },

  setCPUSurcharged: (isCPUSurcharged) => set({ isCPUSurcharged }),
  setHardwareInfo: (ram, cores) => set({ ram, cores }),
  setFps: (currentFps) => set({ currentFps }),

  setLODLevel: (lodLevel: LODLevel) => {
    set({
      lodLevel,
      disableCSSAnimations: lodLevel >= 1,
      bypassEQ: lodLevel >= 2,
      bypassReverbFX: lodLevel >= 3,
      reducePolyphony: lodLevel >= 4,
    });

    if (typeof document !== 'undefined') {
      document.body.classList.toggle('disable-heavy-animations', lodLevel >= 1);
    }
  },

  setAudioQuality: (audioQuality: AudioQuality) => {
    const targetLOD: LODLevel = audioQuality === 'low' ? 3 : audioQuality === 'medium' ? 1 : 0;
    set({ audioQuality });
    get().setLODLevel(targetLOD);
  },
}));
