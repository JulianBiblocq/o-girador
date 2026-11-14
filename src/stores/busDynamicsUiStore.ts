/**
 * busDynamicsUiStore.ts — Micro-store UI de la Dynamique de Bus (< 40 lignes).
 * Évite de faire transiter un callback à travers 5 couches mémoïsées (MixerTracksContainer -> ... -> ChannelStripEQ) :
 * ConsoleMixer lit `activeBusDynamicsTrackId` (branchement `React.lazy` de BusDynamicsModal en Mission 3.C).
 */
import { create } from 'zustand';

interface BusDynamicsUiState {
  activeBusDynamicsTrackId: number | null;
  /** PC Studio uniquement (`!isMobile && !isPracticeMode`), piloté par ConsoleMixer. */
  studioPanelsEnabled: boolean;
  openBusDynamics: (trackId: number) => void;
  closeBusDynamics: () => void;
  setStudioPanelsEnabled: (enabled: boolean) => void;
}

export const useBusDynamicsUiStore = create<BusDynamicsUiState>((set, get) => ({
  activeBusDynamicsTrackId: null,
  studioPanelsEnabled: false,
  openBusDynamics: (trackId) => {
    if (!get().studioPanelsEnabled) return;
    set({ activeBusDynamicsTrackId: trackId });
  },
  closeBusDynamics: () => set({ activeBusDynamicsTrackId: null }),
  setStudioPanelsEnabled: (enabled) => {
    if (get().studioPanelsEnabled === enabled) return;
    set(enabled ? { studioPanelsEnabled: true } : { studioPanelsEnabled: false, activeBusDynamicsTrackId: null });
  },
}));

