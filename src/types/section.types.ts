/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern, CatalogVisibility } from './pattern.types';
import { TimeSignature } from './common.types';

export interface CatalogItem {
  file: string;
  name: string;
}

export interface SongSection {
  id: string;
  name: string;
  startMeasure: number;
  endMeasure: number;
  color?: string;
  repeatCount?: number;
  level?: number;
}

export interface SongMarker {
  id: string;
  name: string;
  measure: number;
  color?: string;
}

export interface SavedSectionTrack {
  id?: number;
  instrumentIdx: number;
  isMute: boolean;
  isSolo: boolean;
  volumeVal: number;
  reverbVal?: number;
  panVal?: number;
  pan?: number;
  swingIntensity?: number;
  balancoPresetId?: string;
  balancoAmount?: number;
  fxSends?: {
    reverb: number;
    distortion: number;
  };
  patterns: Pattern[];
}

export interface SavedSectionData {
  numMeasures: number;
  timeSigs: TimeSignature[];
  vols: number[];
  volTransitions: ('immediate' | 'ramp' | 'bezier')[];
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
  data: string;
  audioUrl?: string | null;
}

export interface CloudPreset {
  id: string;
  name: string;
  data: string;
  ownerId: string;
  visibility: CatalogVisibility;
  targetUserId?: string;
  mestreId?: string | null;
  groupId?: string | null;
  createdAt: number;
  isFavorite?: boolean;
  audioUrl?: string | null;
  isDraft?: boolean;
  updatedAt?: number | null;
}
