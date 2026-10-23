
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
  onVariationStepValueChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => void;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onAddPatternVariation?: (patternId: number) => void;
}
