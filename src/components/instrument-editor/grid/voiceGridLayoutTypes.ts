
import React from 'react';
import { Pattern } from '../../../types';

export interface VoiceGridLayoutProps {
  trackId: number;
  pattern: Pattern;
  timeSig: string;
  lang: string;
  isTupletEditMode: boolean;
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean;
  selectedStepRange: any;
  isMultiSelectActive: boolean;
  preRollLengthComputed: number;
  swingOffsets: Float32Array | number[];
  isStepInRange: (range: any, cellIsPreRoll: boolean, cellStep: number, preRollCount: number) => boolean;
  handlePatternBeatResolutionChange: (patternId: number, beatIndex: number, resolution: number) => void;
  handleSetPatternAllBeatsResolution: (patternId: number, resolution: number) => void;
  handleDeletePatternMeasure: (trackId: number, patternId: number, measureIndex: number) => void;
  handleVoiceStepClear: (trackId: number, patternId: number, stepIdx: number, isPreRoll?: boolean) => void;
  handleVoicePreRollStepClear: (trackId: number, patternId: number, stepIdx: number) => void;
  handleVoiceTouchStart: (e: React.TouchEvent<HTMLDivElement>, stepIndex: number) => void;
  handleVoiceMouseDown: (e: React.MouseEvent<HTMLDivElement>, stepIndex: number) => void;
  handleVoiceMouseEnter: (stepIndex: number, e?: React.MouseEvent) => void;
  handleVoicePreRollMouseDown: (e: React.MouseEvent<HTMLDivElement>, stepIndex: number) => void;
  handleVoiceContextMenu: (e: React.MouseEvent<any>, stepIndex: number, isPreRoll?: boolean) => void;
  handleVoiceTypeToggle: (trackId: number, patternId: number, stepIndex: number) => void;
  handleVoiceSylChange: (trackId: number, patternId: number, stepIndex: number, syl: string) => void;
  handleVoicePreRollSylChange: (trackId: number, patternId: number, stepIndex: number, syl: string) => void;
  handleVoiceNoteChange: (trackId: number, patternId: number, stepIndex: number, note: string) => void;
  handleVoiceNoteBlur: (trackId: number, patternId: number, stepIndex: number, note: string) => void;
  handleVoicePreRollNoteBlur: (trackId: number, patternId: number, stepIndex: number, note: string) => void;
  handleVoiceFocusStep: (stepIndex: number, isPreRoll?: boolean) => void;
  handleSelectStepForSculpt: (stepIndex: number) => void;
  handleVoiceNav: (target: HTMLInputElement, key: string, field: 'syl' | 'note') => void;
  focusVoiceStep: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
  handleTrackStepsChange: (trackId: number, patternId: number, newSteps: number) => void;
  handleGridTouchMove: (e: React.TouchEvent) => void;
  handleGridTouchEnd: (e: React.TouchEvent) => void;
}
