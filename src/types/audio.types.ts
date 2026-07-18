/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TimeSignature = '4/4' | '3/4' | '2/4' | '6/8' | '12/8';

export interface HitTrigger {
  trackId: number;
  stepIndex: number;
  state: string | number;
}

export class HitTriggerPool {
  public readonly buffer: HitTrigger[];
  public readonly size: number;
  public writeIndex: number = 0;
  public readIndex: number = 0;

  constructor(size: number = 512) {
    this.size = size;
    this.buffer = Array.from({ length: size }, () => ({
      trackId: 0,
      stepIndex: 0,
      state: 0
    }));
  }

  public push(trackId: number, stepIndex: number, state: string | number): void {
    const item = this.buffer[this.writeIndex];
    item.trackId = trackId;
    item.stepIndex = stepIndex;
    item.state = state;

    const nextWrite = (this.writeIndex + 1) % this.size;

    // Si le pointeur d'écriture percute le pointeur de lecture (Buffer Plein)
    if (nextWrite === this.readIndex) {
      // On avance le pointeur de lecture pour abandonner la note la plus ancienne non dessinée
      this.readIndex = (this.readIndex + 1) % this.size;
    }

    this.writeIndex = nextWrite;
  }

  public clear(): void {
    this.writeIndex = 0;
    this.readIndex = 0;
  }
}

export type SwingMode = 'maracatu' | 'custom' | 'off';

export interface GlobalSwing {
  mode: SwingMode;
  customOffsets: [number, number, number, number]; // e.g. [0, 8, -29, -58]
  swingIntensity?: number; // 0 to 100
}

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
  description?: string;
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

import { TrackGroup, SongSection, SongMarker } from './store.types';

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

export interface CloudRhythmSignal {
  id: string;
  mestreId: string;
  name: string;
  imageUrl: string;
  createdAt: number;
}
