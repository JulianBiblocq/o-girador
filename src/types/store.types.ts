/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern } from './pattern.types';

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
  tuningPitch?: number;
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
}

export type Track = TrackGroup;

export interface MasterFX {
  reverb: {
    returnVolume: number;
    time: number;
    isMuted: boolean;
  };
  distortion: {
    returnVolume: number;
    drive: number;
    isMuted: boolean;
  };
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
  preferredInstrumentName: string | null;
}

export interface TrainingSlice extends TrainingState {
  setTocarJuntoTrack: (trackId: number | null, baseOnly?: boolean) => void;
  setTocarJuntoMuteScope: (scope: 'track' | 'family') => void;
  setTocarJuntoIsMuted: (isMuted: boolean) => void;
  setIsolateBaseOnly: (baseOnly: boolean) => void;
  resetFirstPassRegistry: () => void;
  markFirstPassConsumed: (key: string) => void;
  setFocusTrackId: (trackId: number | null, preferredName?: string) => void;
  toggleFocusMode: (explicitTrackId?: number) => void;
  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => void;
}

export interface ToadaConductorSlot {
  puxadorPatternId?: number;
  coroPatternId?: number;
  measuresCount: number;
}
