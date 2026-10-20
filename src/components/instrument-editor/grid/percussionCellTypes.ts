/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StepSculptValue } from '../../../types';

export interface PercussionStepCellProps {
  i: number;
  val: string | number | [string, string];
  volume: StepSculptValue;
  decay: StepSculptValue;
  microtiming: StepSculptValue;
  isSelected: boolean;
  isMultiSelected: boolean;
  isFocused: boolean;
  selectedSubIndex?: 0 | 1 | null;
  activeTool?: string | number;
  shiftPx: number;
  colorStyle: React.CSSProperties;
  splitLeftColor?: string;
  splitRightColor?: string;
  splitLeftText?: string;
  splitRightText?: string;
  isMultiSelectActive: boolean;
  isSextuplet: boolean;
  isTriplet: boolean;
  isOcto: boolean;
  indexInGroup: number;
  totalShift: number | [number, number];
  trackId: number;
  patternId: number;

  onMouseDown: (e: React.MouseEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onMouseEnter: (index: number, e?: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: string | number | [string, string], subIndex?: 0 | 1) => void;
  onSelectForSculpt?: (index: number, subIndex?: 0 | 1) => void;
}
