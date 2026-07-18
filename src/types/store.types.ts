/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PatternVariation {
  id: string;
  name: string;
  steps: (string | number)[];
  probability: number;
  volumes?: number[];
  decays?: number[];
  microtimings?: number[];
  beatResolutions?: number[]; // Added for tuplet support (e.g. [4, 4, 4, 4])
  playFirstTimeOnly?: boolean;
}

export interface Pattern {
  id: number;
  name: string;
  steps: number;
  activeSteps: (string | number)[];
  lyrics: string[];
  notes: string[];
  measureAssignments: boolean[];
  measureAllowVariations?: boolean[];
  volumes?: number[];
  decays?: number[];
  microtimings?: number[];
  vocalMode?: 'synth' | 'micro';
  vocalLatency?: number;
  vocalBaseBpm?: number;
  vocalBpmSync?: boolean;
  vocalAudioData?: string;
  vocalAudioUrl?: string;
  vocalNudge?: number;
  vocalTrimStart?: number;
  beatResolutions?: number[]; // Added for tuplet support
  variations?: PatternVariation[];
  preRollActiveSteps?: (string | number)[];
  preRollLyrics?: string[];
  preRollNotes?: string[];
  preRollVolumes?: number[];
  preRollDecays?: number[];
}

export interface SavedPattern {
  id: string;
  instrumentId: string;
  name: string;
  folder: string;
  steps: (string | number)[];
  variations: PatternVariation[];
  volumes?: number[];
  decays?: number[];
  microtimings?: number[];
  createdAt: number;
}

export type CatalogVisibility = 'admin_global' | 'mestre_group' | 'private' | 'specific_user';

export interface CloudPattern extends SavedPattern {
  ownerId: string;
  visibility: CatalogVisibility;
  mestreId?: string;
}

export interface TrackGroup {
  id: number;
  instrumentIdx: number;
  patterns: Pattern[];
  isMute: boolean;
  isSolo: boolean;
  isHidden: boolean;
  volumeVal: number;
  selectedPatternId: number;
  radius?: number; // visual radius in the roda
  reverbVal?: number;
  panVal?: number; // -100 to 100
  pan?: number; // -100 to 100
  swingIntensity?: number; // 0 to 100
  fxSends?: {
    reverb: number; // 0 to 100
    distortion: number; // 0 to 100
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
}

export interface CatalogItem {
  file: string;
  name: string;
}

export interface SongSection {
  id: string;
  name: string;
  startMeasure: number; // 0-based index
  endMeasure: number;   // 0-based index, inclusive
  color?: string;       // couleur CSS (ex: hex)
  repeatCount?: number; // multiplicateur de section (défaut 1)
  level?: number;       // 0 pour base, 1 pour super-section, etc.
}

export interface SongMarker {
  id: string;
  name: string;
  measure: number; // 0-based index
  color?: string;
}

export interface SavedSectionTrack {
  instrumentIdx: number;
  isMute: boolean;
  isSolo: boolean;
  volumeVal: number;
  reverbVal?: number;
  panVal?: number;
  pan?: number;
  swingIntensity?: number;
  fxSends?: {
    reverb: number;
    distortion: number;
  };
  patterns: Pattern[]; // Patterns mapped to the section's measures
}

import { TimeSignature } from './audio.types';

export interface SavedSectionData {
  numMeasures: number;
  timeSigs: TimeSignature[];
  vols: number[];
  volTransitions: ('immediate' | 'ramp')[];
  signals: (string | null)[];
  tracks: SavedSectionTrack[];
}

export interface CloudSection {
  id: string;
  name: string;
  ownerId: string;
  visibility: CatalogVisibility;
  mestreId?: string;
  createdAt: number;
  data: string; // LZString compressed JSON of SavedSectionData
}

export interface CloudPreset {
  id: string;
  name: string;
  data: string; // JSON stringified Preset (LZString compressed)
  ownerId: string;
  visibility: CatalogVisibility;
  targetUserId?: string;
  createdAt: number;
}

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
