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
  color?: string;
}
export interface PatternVariation {
  id: string;
  name: string;
  steps: (string | number)[];
  probability: number;
  volumes?: number[];
  decays?: number[];
  microtimings?: number[];
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

export interface RhythmSignal {
  id: string;
  name: string;
  image: string; // base64 JPEG
}

export interface PresetMetadata {
  toada: string;
  nacao: string;
  compositor: string;
  ritmo: string;
  youtubeUrl?: string;
  partitionImage?: string; // base64 JPEG
  rhythmSignals?: RhythmSignal[];
}

export interface Preset {
  bpm: number;
  timeSig: TimeSignature;
  totalMeasures?: number;
  circles?: Circle[]; // Old format
  tracks?: TrackGroup[]; // New format
  letras?: string;
  metadata?: PresetMetadata;
  measureTimeSigs?: TimeSignature[];
  measureBpms?: number[];
  measureBpmTransitions?: ('immediate' | 'ramp')[];
  measureVols?: number[];
  measureVolTransitions?: ('immediate' | 'ramp')[];
  songSections?: SongSection[];
  measureSignals?: (string | null)[]; // signal id par mesure
  masterEQ?: { low: number; mid: number; high: number };
  masterCompressor?: { threshold: number; ratio: number };
  masterVol?: number;
  version?: number;
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
}

