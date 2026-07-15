import { create } from 'zustand';

export interface PerformanceState {
  ram: number | undefined;     // Quantité de mémoire vive de l'appareil (en Go) ou undefined si indisponible
  cores: number | undefined;   // Nombre de cœurs CPU ou undefined si indisponible
  currentFps: number;          // Valeur courante de frames par seconde (FPS)
  isCPUSurcharged: boolean;    // Flag de surcharge CPU dynamique

  setCPUSurcharged: (val: boolean) => void;
  setHardwareInfo: (ram: number | undefined, cores: number | undefined) => void;
  setFps: (fps: number) => void;
}

/**
  * Justification de l'impact CPU & Thread Audio :
  * - Le store Zustand est découplé de la boucle audio temps réel (AudioEngine).
  * - L'écriture dans ce store s'effectue hors du thread audio pour éviter d'introduire du jitter ou de bloquer le Main Thread.
  * - Les abonnements aux propriétés de ce store doivent cibler uniquement les valeurs scalaires requises pour éviter les re-rendus React inutiles (Zero Render Thrashing).
  */
export const usePerformanceStore = create<PerformanceState>((set) => ({
  ram: undefined,
  cores: undefined,
  currentFps: 60,
  isCPUSurcharged: false,

  setCPUSurcharged: (isCPUSurcharged) => set({ isCPUSurcharged }),
  setHardwareInfo: (ram, cores) => set({ ram, cores }),
  setFps: (currentFps) => set({ currentFps }),
}));
