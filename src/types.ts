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

export interface CloudPattern extends SavedPattern {
  // CloudPattern inherits id, instrumentId, name, folder, steps, variations, volumes, decays, microtimings, createdAt
  ownerId: string;
  visibility: CatalogVisibility;
  mestreId?: string; // To associate it with a specific mestre catalog
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

export type SwingMode = 'maracatu' | 'custom' | 'off';

export interface GlobalSwing {
  mode: SwingMode;
  customOffsets: [number, number, number, number]; // e.g. [0, 8, -29, -58]
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
  songMarkers?: SongMarker[];
  measureSignals?: (string | null)[]; // signal id par mesure
  masterEQ?: { low: number; mid: number; high: number };
  masterCompressor?: { threshold: number; ratio: number };
  masterVol?: number;
  masterReverbVol?: number;
  reverbDecay?: number;
  isSwingOn?: boolean; // Keep for backward compatibility
  globalSwing?: GlobalSwing;
  loopStartMeasure?: number;
  loopEndMeasure?: number;
  isLoopRegionActive?: boolean;
  isLooping?: boolean;
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

export type CatalogVisibility = 'admin_global' | 'mestre_group' | 'private' | 'specific_user';

export interface CloudPreset {
  id: string; // Document ID
  name: string;
  data: string; // JSON stringified Preset (LZString compressed)
  ownerId: string;
  visibility: CatalogVisibility;
  targetUserId?: string; // If specific_user
  createdAt: number;
}

export interface CloudRhythmSignal {
  id: string;
  mestreId: string;
  name: string;
  imageUrl: string;
  createdAt: number;
}
