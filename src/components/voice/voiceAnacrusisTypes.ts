/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types d'interface pour la section anacrouse vocale (< 35 lignes).
 */

import React from 'react';
import type { Pattern } from '../../types/store.types';

export interface VoiceAnacrusisProps {
  pattern: Pattern;
  trackId: number;
  lang: string;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean | null;
  selectedStepRange: any;
  preRollLengthComputed: number;
  isStepInRange: (range: any, isPre: boolean, idx: number, len: number) => boolean;
  handleVoicePreRollStepClear?: (tId: number, pId: number, i: number, isPre?: boolean) => void;
  handleVoicePreRollMouseDown?: (e: React.MouseEvent<HTMLDivElement>, i: number) => void;
  handleVoiceContextMenu?: (e: React.MouseEvent<any>, i: number, isPre?: boolean) => void;
  handleVoicePreRollSylChange: (tId: number, pId: number, i: number, val: string) => void;
  handleVoiceNoteChange: (tId: number, pId: number, i: number, note: string) => void;
  handleVoicePreRollNoteBlur: (tId: number, pId: number, i: number, note: string) => void;
  handleVoiceFocusStep: (idx: number, isPre?: boolean) => void;
  handleVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
}
