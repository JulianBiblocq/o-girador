/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface VoiceKeyCtx {
  trackId: number;
  patternId: number;
  i: number;
  steps: number;
  isPreRoll?: boolean;
  preRollLength?: number;
  onVoiceStepClear?: (trackId: number, patternId: number, index: number, isPreRoll?: boolean) => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
  onVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  onVoiceSylChange: (trackId: number, patternId: number, index: number, value: string) => void;
  onVoiceNoteChange: (trackId: number, patternId: number, index: number, value: string) => void;
}
