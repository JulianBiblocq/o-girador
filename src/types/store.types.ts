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
  beatResolutions?: number[]; // Added for tuplet support
  variations?: PatternVariation[];
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
