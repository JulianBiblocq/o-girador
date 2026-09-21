/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MusicalStyleId = 'maracatu' | 'samba' | 'capoeira';

export interface ThemeColorVariant {
  dark: string;
  light: string;
}

export interface EqBandDefinition {
  color: string;
  label: string;
}

export interface MixerThemeDefinition {
  id: MusicalStyleId;
  name: string;
  master: {
    stripBg: ThemeColorVariant;
    headerBg: ThemeColorVariant;
    headerText: ThemeColorVariant;
    border: ThemeColorVariant;
    faderThumb: ThemeColorVariant;
    vuMeterActive: ThemeColorVariant;
    vuMeterTrack: ThemeColorVariant;
    compressorBg: ThemeColorVariant;
    compressorColor?: string;
  };
  eq: {
    low: EqBandDefinition;
    mid: EqBandDefinition;
    high: EqBandDefinition;
    rangeDb: number;
  };
  effects: {
    reverb: {
      accentColor: string;
      bgTint: ThemeColorVariant;
    };
    distortion: {
      accentColor: string;
      bgTint: ThemeColorVariant;
      opacityMin: number;
      opacityMax: number;
    };
  };
  transport: {
    accentColor: string;
    iconColor: ThemeColorVariant;
  };
}
