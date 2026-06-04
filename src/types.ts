/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InstrumentConfig {
  id: string;
  iconImg: string;
  name: string;
  type: 'hands' | 'gongue' | 'shake' | 'voice';
  mixerBg: string;
  path: string;
  colors: {
    [key: string]: string;
  };
}

export interface Pattern {
  id: number;
  name: string;
  steps: number;
  activeSteps: (string | number)[];
  lyrics: string[];
  notes: string[];
  measureAssignments: boolean[];
  volumes?: number[];
  decays?: number[];
  microtimings?: number[];
}

export interface HitTrigger {
  trackId: number;
  stepIndex: number;
  state: string | number;
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

// Keep Circle type for backward compatibility parsing temporarily if needed
export interface Circle {
  id: number;
  steps: number;
  repeats: number;
  activeSteps: (string | number)[];
  instrumentIdx: number;
  lyrics: string[];
  notes: string[];
  isMute: boolean;
  isSolo: boolean;
  isHidden: boolean;
  volumeVal: number;
  radius?: number;
}

export type TimeSignature = '4/4' | '3/4' | '2/4' | '6/8' | '12/8';

export type Language = 'pt' | 'fr';

export interface PresetMetadata {
  toada: string;
  nacao: string;
  compositor: string;
  ritmo: string;
  youtubeUrl?: string;
}

export interface Preset {
  bpm: number;
  timeSig: TimeSignature;
  totalMeasures?: number;
  circles?: Circle[]; // Old format
  tracks?: TrackGroup[]; // New format
  letras?: string;
  metadata?: PresetMetadata;
}

export interface CatalogItem {
  file: string;
  name: string;
}
