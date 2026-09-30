/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VocalPresetId = 'guide' | 'rhodes' | 'pifano' | 'organ' | 'pluck';

export interface VocalPresetDefinition {
  id: VocalPresetId;
  synthClass: 'Synth' | 'FMSynth';
  nameFr: string;
  namePt: string;
  descFr: string;
  descPt: string;
  options: Record<string, any>;
}

export const VOCAL_PRESETS: Record<VocalPresetId, VocalPresetDefinition> = {
  guide: {
    id: 'guide',
    synthClass: 'Synth',
    nameFr: 'Guide (Standard)',
    namePt: 'Guia (Padrão)',
    descFr: 'Synthétiseur onde triangle doux et équilibré',
    descPt: 'Sintetizador onda triângulo suave e equilibrado',
    options: {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3,
      },
    },
  },
  rhodes: {
    id: 'rhodes',
    synthClass: 'FMSynth',
    nameFr: 'Rhodes (FM Vintage)',
    namePt: 'Rhodes (FM Vintage)',
    descFr: 'Piano électrique feutré et chaud (synthèse FM)',
    descPt: 'Piano elétrico quente e aveludado (síntese FM)',
    options: {
      harmonicity: 3,
      modulationIndex: 1.5,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.8,
        sustain: 0.4,
        release: 0.5,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.5,
        sustain: 0.2,
        release: 0.5,
      },
    },
  },
  pifano: {
    id: 'pifano',
    synthClass: 'Synth',
    nameFr: 'Pífano (Flûte du Sertão)',
    namePt: 'Pífano (Flauta do Sertão)',
    descFr: 'Onde sinus filtrée avec attaque douce',
    descPt: 'Onda senoidal com ataque suave de flauta',
    options: {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.06,
        decay: 0.2,
        sustain: 0.9,
        release: 0.4,
      },
    },
  },
  organ: {
    id: 'organ',
    synthClass: 'Synth',
    nameFr: 'Orgue (Pulse Cordel)',
    namePt: 'Órgão (Pulse Cordel)',
    descFr: 'Double onde carrée perçante à attaque instantanée',
    descPt: 'Onda quadrada pulsada marcante e ataque rápido',
    options: {
      oscillator: { type: 'pulse', width: 0.2 },
      envelope: {
        attack: 0.005,
        decay: 0.05,
        sustain: 1,
        release: 0.1,
      },
    },
  },
  pluck: {
    id: 'pluck',
    synthClass: 'Synth',
    nameFr: 'Pluck (Pincé percussif)',
    namePt: 'Pluck (Dedilhado percussivo)',
    descFr: 'Onde triangle percussive à extinction rapide',
    descPt: 'Onda triangular percussiva com decaimento rápido',
    options: {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.005,
        decay: 0.18,
        sustain: 0,
        release: 0.18,
      },
    },
  },
};

export const VOCAL_PRESET_LIST: VocalPresetDefinition[] = [
  VOCAL_PRESETS.guide,
  VOCAL_PRESETS.rhodes,
  VOCAL_PRESETS.pifano,
  VOCAL_PRESETS.organ,
  VOCAL_PRESETS.pluck,
];
