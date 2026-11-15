import type { Pattern } from './pattern.types';
import type {
  StudioReverbConfig,
  StudioDistortionConfig,
  StudioMasterBusConfig,
} from '../audio/effects/studioFxPresets';
import type { BusCompressorSettings } from '../audio/effects/busCompressorTypes';

export * from './pattern.types';
export * from './section.types';

export interface TrackGroup {
  id: number;
  instrumentIdx: number;
  patterns: Pattern[];
  isMute: boolean;
  isSolo: boolean;
  isHidden: boolean;
  volumeVal: number;
  selectedPatternId: number;
  radius?: number;
  reverbVal?: number;
  panVal?: number;
  tuning?: number;
  trackDecay?: number;
  pan?: number;
  swingIntensity?: number;
  balancoPresetId?: string;
  balancoAmount?: number;
  fxSends?: {
    reverb: number;
    distortion: number;
  };
  linkedToTrackId?: string;
  busId?: string;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
  isLinkMaster?: boolean;
  isFolded?: boolean;
  isSequencerFolded?: boolean;
  customName?: string;
  patternOverrides?: Record<number, number | null>;
  lowCut?: boolean;
  eqBands?: {
    low: { f: number; g: number };
    mid: { f: number; g: number; q: 'wide' | 'narrow' };
    high: { f: number; g: number };
  };
  measureVols?: number[];
  measureVolTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  measurePans?: number[];
  measurePanTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  measureReverbSends?: number[];
  measureReverbTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  automationBypass?: {
    volume?: boolean;
    pan?: boolean;
    reverb?: boolean;
  };
  /** Inversion de polarité 180° (Pistes ET dossiers Bus / Link / Toada), `false` par défaut. */
  phaseInverted?: boolean;
  /** Compresseur VCA de sous-groupe (`isBusFolder`, `isLinkFolder`, bus vocal Toada). */
  busCompressor?: BusCompressorSettings;
}

export type Track = TrackGroup;

export interface MasterFX {
  reverb: StudioReverbConfig;
  distortion: StudioDistortionConfig;
  masterBus?: Partial<StudioMasterBusConfig>;
}

export interface VocalStateBuffers {
  vocalBuffers: Record<string | number, AudioBuffer>;
  vocalBlobs?: Record<string | number, Blob>;
}

export interface TrainingState {
  tocarJuntoActive: boolean;
  tocarJuntoTrackId: number | null;
  tocarJuntoMuteScope: 'track' | 'family';
  tocarJuntoIsMuted: boolean;
  isolateBaseOnly: boolean;
  firstPassRegistry: Record<string, boolean>;
  isFocusActive: boolean;
  focusTrackId: number | null;
  referenceTrackId: number | null;
  preferredInstrumentName: string | null;
  hasManualFocusSelection: boolean;
}

export interface TrainingSlice extends TrainingState {
  setTocarJuntoTrack: (trackId: number | null, baseOnly?: boolean) => void;
  setTocarJuntoMuteScope: (scope: 'track' | 'family') => void;
  setTocarJuntoIsMuted: (isMuted: boolean) => void;
  setIsolateBaseOnly: (baseOnly: boolean) => void;
  resetFirstPassRegistry: () => void;
  markFirstPassConsumed: (key: string) => void;
  setFocusTrackId: (trackId: number | null, preferredName?: string, isManual?: boolean) => void;
  setPreferredInstrumentName: (name: string | null, userProfile?: any) => void;
  setReferenceTrackId: (trackId: number | null) => void;
  toggleFocusMode: (explicitTrackId?: number) => void;
  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => void;
}

export interface ToadaConductorSlot {
  puxadorPatternId?: number;
  coroPatternId?: number;
  measuresCount: number;
  advanceMeasures?: number;
  isSilenceSlot?: boolean;
}
