/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern } from '../../../types';

export interface InstrumentPatternGridProps {
  trackId: number;
  pattern: Pattern;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    [key: string]: any;
  };
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  selectedSubIndex?: 0 | 1 | null;
  setSelectedSubIndex?: React.Dispatch<React.SetStateAction<0 | 1 | null>>;
  isTupletEditMode: boolean;
  isMultiSelectActive: boolean;
  selectedStepIsPreRoll?: boolean;
  activeTool?: string;
  isAlternating?: boolean;

  // React State setters
  setSelectedStepIsPreRoll?: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPatternId: React.Dispatch<React.SetStateAction<number>>;
  setSelectedStepIdx: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedVariationId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
  setIsMultiSelectActive: React.Dispatch<React.SetStateAction<boolean>>;

  // Touch and Copy/Paste Props (UI specific)
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean,
    subIndex?: 0 | 1
  ) => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  canPaste?: boolean;
}
