/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types d'interface pour les sections d'effets Master (< 40 lignes).
 */

export interface MasterDistortionSectionProps {
  distortionDrive: number;
  returnVolume: number;
  isDistoActive: boolean;
  t: (key: any) => string;
  setMasterFxParam: (fx: 'reverb' | 'distortion', param: 'drive' | 'time', val: number) => void;
  setMasterFxVolume: (fx: 'reverb' | 'distortion', val: number) => void;
  toggleMasterEffectActive: (fx: 'reverb' | 'disto') => void;
}

export interface MasterReverbSectionProps {
  reverbTime: number;
  returnVolume: number;
  isReverbActive: boolean;
  t: (key: any) => string;
  setMasterFxParam: (fx: 'reverb' | 'distortion', param: 'drive' | 'time', val: number) => void;
  setMasterFxVolume: (fx: 'reverb' | 'distortion', val: number) => void;
  toggleMasterEffectActive: (fx: 'reverb' | 'disto') => void;
}

export interface MasterEqCompressorSectionProps {
  t: (key: string) => string;
  lang: string;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
}
