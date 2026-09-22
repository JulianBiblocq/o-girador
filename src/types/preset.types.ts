/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeSignature } from './common.types';
import { TrackGroup, SongSection, SongMarker, MasterFX } from './store.types';

export type SwingMode = 'maracatu' | 'custom' | 'off';

export interface GlobalSwing {
  mode: SwingMode;
  customOffsets: [number, number, number, number]; // e.g. [0, 8, -29, -58]
  swingIntensity?: number; // 0 to 100
}

export interface PreRollSettings {
  enabled: boolean;                      // Précompte actif en session
  measuresCount: 1 | 2;                  // 1 ou 2 mesures de précompte
  startSignalMeasure1Id?: string | null; // Signal pour la 1ère mesure (si 2 mesures choisies)
  startSignalMeasure2Id?: string | null; // Signal pour la mesure d'amorce immédiate (ou mesure unique)
}

export interface RhythmSignal {
  id: string;
  name: string;
  image: string; // base64 JPEG ou URL
  frames?: string[]; // Tableau des trames WebP/base64 Cordel
  beatsCount?: number; // Nombre dynamique de trames selon la signature (bannir le 4 en dur)
  createdAt?: number;
}

export interface PresetMetadata {
  toada: string;
  nacao: string;
  compositor: string;
  ritmo: string;
  youtubeUrl?: string;
  partitionImage?: string; // base64 JPEG
  rhythmSignals?: RhythmSignal[];
  description?: string;
  descriptionPt?: string;
  descriptionFr?: string;
  preRollSettings?: PreRollSettings;
}

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
  measureBpmTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  measureVols?: number[];
  measureVolTransitions?: ('immediate' | 'ramp' | 'bezier')[];
  songSections?: SongSection[];
  songMarkers?: SongMarker[];
  measureSignals?: (string | null)[]; // signal id par mesure
  preRollSettings?: PreRollSettings;
  masterEQ?: { low: number; mid: number; high: number };
  masterCompressor?: { threshold: number; ratio: number };
  masterVol?: number;
  masterReverbVol?: number;
  reverbDecay?: number;
  masterFX?: MasterFX;
  masterDistortion?: number; // Compat alias (0-100)
  masterDistortionDrive?: number; // Compat alias (0-100)
  isSwingOn?: boolean; // Keep for backward compatibility
  globalSwing?: GlobalSwing;
  loopStartMeasure?: number | null;
  loopEndMeasure?: number | null;
  isLoopRegionActive?: boolean;
  loopMode?: 'infinite' | number;
  isLooping?: boolean;
  isLoopExitRequested?: boolean;
  version?: number;
  rodaTrackOrder?: number[];
}

export interface CloudRhythmSignal extends RhythmSignal {
  mestreId: string;
  imageUrl?: string;
  isGlobal?: boolean;
}
