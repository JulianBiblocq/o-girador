/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeSignature } from '../../types';

export interface TransportSlice {
  totalMeasures: number;
  maxMeasuresAllowed: number | null;
  bpm: number;
  nominalPresetBpm: number;
  nominalPresetMeasureBpms: number[];
  timeSig: TimeSignature;
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureSignals: (string | null)[];
  isMasterVolumeBypassed?: boolean;

  setTotalMeasures: (val: number | ((prev: number) => number), bypassLimit?: boolean) => void;
  setMaxMeasuresAllowed: (val: number | null) => void;
  setBpm: (bpm: number) => void;
  applyGlobalBpmDelta: (delta: number) => void;
  setGlobalBpm: (targetBpm: number) => void;
  resetTempoToNominal: () => void;
  setNominalPresetTempo: (bpm: number, measureBpms: number[]) => void;
  setTimeSig: (sig: TimeSignature) => void;
  setMeasureSignals: (updater: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => void;
  setMeasureBpms: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureTimeSigs: (updater: TimeSignature[] | ((prev: TimeSignature[]) => TimeSignature[])) => void;
  setMeasureBpmTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  setMeasureVols: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureVolTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  toggleMasterVolumeBypass: () => void;
  handleTotalMeasuresChange: (val: number) => void;
  handleMeasureTimeSigChange: (measureIdx: number, val: TimeSignature) => void;
  handleMeasureBpmChange: (measureIdx: number, val: number) => void;
  handleMeasureTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleMeasureVolChange: (measureIdx: number, val: number) => void;
  handleMeasureVolTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleDeleteMeasure: (measureIdx: number) => void;
  handleInsertMeasure: (measureIdx: number, amount?: number) => void;
}
