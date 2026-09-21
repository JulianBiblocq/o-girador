/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MixerThemeDefinition } from './mixerTheme.types';

export const MARACATU_MIXER_THEME: MixerThemeDefinition = {
  id: 'maracatu',
  name: 'Maracatu de Baque Virado',
  master: {
    stripBg: {
      dark: '#251c1a',
      light: '#e7d5c1',
    },
    headerBg: {
      dark: '#0f0f0f',
      light: '#1a1a1a',
    },
    headerText: {
      dark: '#f4ecd8',
      light: '#f4ecd8',
    },
    border: {
      dark: '#f4ecd8',
      light: '#1a1a1a',
    },
    faderThumb: {
      dark: '#8b2a1a',
      light: '#8b2a1a',
    },
    vuMeterActive: {
      dark: '#8b2a1a',
      light: '#8b2a1a',
    },
    vuMeterTrack: {
      dark: 'rgba(244, 236, 216, 0.15)',
      light: 'rgba(26, 26, 26, 0.12)',
    },
    compressorBg: {
      dark: 'rgba(212, 175, 55, 0.08)',
      light: 'rgba(212, 175, 55, 0.06)',
    },
    compressorColor: '#d4af37',
  },
  eq: {
    low: {
      color: '#8b2a1a',
      label: 'GRAVES',
    },
    mid: {
      color: '#d4af37',
      label: 'MÉDIUMS',
    },
    high: {
      color: '#3d8b85',
      label: 'AIGUS',
    },
    rangeDb: 6.0,
  },
  effects: {
    reverb: {
      accentColor: '#2a5c8a', // Bleu réverbe assourdi Cordel
      bgTint: {
        dark: 'rgba(42, 92, 138, 0.08)',
        light: 'rgba(42, 92, 138, 0.05)',
      },
    },
    distortion: {
      accentColor: '#c25e1a', // Orange distorsion chaud
      bgTint: {
        dark: 'rgba(194, 94, 26, 0.08)',
        light: 'rgba(194, 94, 26, 0.05)',
      },
      opacityMin: 0.12,
      opacityMax: 1.0,
    },
  },
  transport: {
    accentColor: '#8b2a1a',
    iconColor: {
      dark: '#f4ecd8',
      light: '#1a1a1a',
    },
  },
};
