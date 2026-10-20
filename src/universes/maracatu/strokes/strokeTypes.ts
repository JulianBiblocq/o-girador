/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Maracatu Stroke Type Definitions
 */

export interface StrokeDef {
  symbol: string;
  label: string;
  shortcut: string;
  colorKey: string;
}

export interface StrokePair {
  id: string;
  strong: StrokeDef;
  weak?: StrokeDef;
  third?: StrokeDef;
  strokes: StrokeDef[];
  mainLabel: string;
}

export const STEP_OPTIONS = [4, 8, 12, 16, 24, 32];
