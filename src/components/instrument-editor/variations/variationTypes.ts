import React from 'react';
import { Language, Pattern } from '../../../types';

export interface PatternVariationsEditorProps {
  trackId: number;
  lang: Language;
  ptn: Pattern;
  inst: any;
  activeTool: string;
  isAlternating: boolean;
  isLeftHanded: boolean;
  selectedPatternId: number;
  onSelectPattern: (id: number) => void;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  selectedStepIndices: number[];
  selectedSubIndex?: 0 | 1 | null;
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  onStopSoloPattern?: () => void;
  onPlaySoloPattern?: (patternId: number, variationId?: string) => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onDeletePatternVariation?: (patternId: number, variationId: string) => void;
  onVariationStepValueChange?: (
    patternId: number,
    variationId: string,
    stepIdx: number | number[],
    val: string | number | string[] | [string, string],
    options?: { skipUndo?: boolean }
  ) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void,
    trackId?: number,
    isSplit?: boolean,
    subIndex?: 0 | 1
  ) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onAddPatternVariation?: (patternId: number) => void;
}

export interface VariationGridPreviewProps {
  variation: any;
  ptn: any;
  inst: any;
  lang: any;
  activeTool: string;
  isLeftHanded: boolean;
  trackId: number;
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  selectedSubIndex?: 0 | 1 | null;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIndices: number[];
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onSelectPattern: (id: number) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>> | ((indices: number[]) => void);
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  onVariationStepValueChange?: (ptnId: number, varId: string, idx: any, val: any, opts?: { skipUndo?: boolean }) => void;
  onStepTouchStart?: any;
  handleTogglePlay: () => void;
  gesture: {
    beginPaintOrToggle: (idx: number, subIndex: 0 | 1 | undefined, variationId: string | null) => void;
    continueGestureOnEnter: (idx: number, e: React.MouseEvent | undefined, subIndex: 0 | 1 | undefined, variationId: string | null) => void;
    beginErase: (idx: number, subIndex: 0 | 1 | undefined, variationId: string | null) => void;
  };
  handleVariationScissors: (variationId: string, idx: number, val: any) => void;
}
