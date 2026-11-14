import type { BusCompressorPresetArchetypeId, BusCompressorSettings } from '../../audio/effects/busCompressorTypes';

export interface BusDynamicsSlice {
  /** Inversion de polarité 180° (Pistes ET dossiers Bus / Link / Toada) avec point d'Undo. */
  toggleTrackPhaseInvert: (trackId: number) => void;
  /** Initialise via l'archétype auto-détecté (`enabled: true`) puis bascule `enabled`. */
  toggleBusCompressor: (busTrackId: number) => void;
  /** Patch borné (zéro NaN) ; passe en `custom` si un paramètre fin change hors archétype explicite. */
  updateBusCompressor: (
    busTrackId: number,
    patch: Partial<BusCompressorSettings>,
    opts?: { skipUndo?: boolean }
  ) => void;
  /** Applique les constantes d'un archétype Maracatu en gardant `enabled: true`. */
  applyBusCompressorArchetype: (busTrackId: number, archetype: BusCompressorPresetArchetypeId) => void;
}

