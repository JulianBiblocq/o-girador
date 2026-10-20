/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern } from '../../types';

export interface CompactPatternRendererProps {
  pattern: Pattern;
  inst: any;
  isLeftHanded?: boolean;
  isEditable?: boolean;
  onStepValueChange?: (stepIdx: number, val: string) => void;
  onStepClick?: (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: string | number | [string, string]) => void;
  onStepShiftClick?: (e: React.MouseEvent, stepIdx: number, val: string | number | [string, string]) => void;
  currentStep?: number | null;
  className?: string;
  style?: React.CSSProperties;
  isFluid?: boolean;
  readOnly?: boolean;
  onStepKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, stepIdx: number, val: string | number | [string, string]) => void;
  registerStepRef?: (stepIdx: number, el: HTMLInputElement | null) => void;
  onStepMouseEnter?: (stepIdx: number) => void;
  selectedStepIndices?: number[];
  trackId?: string;
  isLinkFolder?: boolean;
  tracks?: any[];
}
