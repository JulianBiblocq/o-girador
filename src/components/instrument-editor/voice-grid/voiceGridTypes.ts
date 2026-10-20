/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern } from '../../../types';

export interface VoicePatternGridSectionProps {
  trackId: number;
  pattern: Pattern;
  timeSig?: string;
  lang: string;
  isTupletEditMode: boolean;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean | null;
  selectedStepRange: any;
  isMultiSelectActive: boolean;
  preRollLengthComputed: number;
  swingOffsets: Float32Array | number[];
  isStepInRange: (range: any, cellIsPreRoll: boolean, cellStep: number, preRollCount: number) => boolean;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, newResolution: number) => void;
  handleSetPatternAllBeatsResolution?: (patternId: number, newResolution: number) => void;
  handleDeletePatternMeasure: (trackId: number, patternId: number, measureIdx: number) => void;
  confirmAsync?: (message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  handleVoiceStepClear: (trackId: number, patternId: number, index: number, isPreRoll?: boolean) => void;
  handleVoiceTouchStart: (e: React.TouchEvent<HTMLDivElement>, index: number) => void;
  handleVoiceMouseDown: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
  handleVoiceMouseEnter: (index: number, e?: React.MouseEvent) => void;
  handleVoiceTypeToggle: (trackId: number, patternId: number, index: number) => void;
  handleVoiceSylChange: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceNoteChange: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceNoteBlur: (trackId: number, patternId: number, index: number, value: string) => void;
  handleVoiceFocusStep: (index: number, isPreRoll?: boolean) => void;
  handleVoiceContextMenu: (e: React.MouseEvent<any>, index: number, isPreRoll?: boolean) => void;
  handleSelectStepForSculpt: (index: number) => void;
  handleVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
}
