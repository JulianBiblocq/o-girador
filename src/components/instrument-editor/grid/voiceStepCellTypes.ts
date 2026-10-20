/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StepSculptValue } from '../../../types';

export interface VoiceStepCellProps {
  i: number;
  steps: number;
  trackId: number;
  patternId: number;
  state: string | number | [string, string];
  syl: string;
  note: string;
  isSelected: boolean;
  isMultiSelectActive: boolean;
  manualMicro?: StepSculptValue;
  totalShift: number;
  shiftPx: number;
  isLinked: boolean;
  volume: StepSculptValue;
  decay: StepSculptValue;
  isPreRoll?: boolean;

  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>, index: number) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
  onMouseEnter?: (index: number, e?: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number) => void;
  onSelectForSculpt?: (index: number) => void;
  onVoiceTypeToggle: (trackId: number, patternId: number, index: number) => void;
  onVoiceSylChange: (trackId: number, patternId: number, index: number, value: string) => void;
  onVoiceNoteChange: (trackId: number, patternId: number, index: number, value: string) => void;
  onVoiceNoteBlur: (trackId: number, patternId: number, index: number, value: string) => void;
  onFocusStep: (index: number, isPreRoll?: boolean) => void;
  onVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
  onVoiceStepClear?: (trackId: number, patternId: number, index: number, isPreRoll?: boolean) => void;
  isInRange?: boolean;
  preRollLength?: number;
  isProlongation?: boolean;
  isFollowedByProlongation?: boolean;
  isFirstInBeat?: boolean;
}
