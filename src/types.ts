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
}

export interface Preset {
  bpm: number;
  timeSig: TimeSignature;
  circles: Circle[];
  letras?: string;
  metadata?: PresetMetadata;
}

export interface CatalogItem {
  file: string;
  name: string;
}
