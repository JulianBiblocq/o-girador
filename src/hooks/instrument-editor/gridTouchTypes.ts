/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types d'interface pour les interactions tactiles sur la grille (< 30 lignes).
 */

import { Pattern } from '../../types';

export interface UseGridTouchInteractionsParams {
  trackId: number;
  pattern: Pattern;
  instrument: { id: string; type: string; [key: string]: any };
  activeTool: string;
  isAlternating: boolean;
  lang: string;
  isLeftHanded: boolean;
  selectedVariationId: string | null;
  isMultiSelectActive: boolean;
  handleScissorsClick: (idx: number, val?: any) => void;
  handleStepTouchStartMulti: (e: any, idx: number) => void;
  onStepTouchStart?: (e: any, pId: number, sIdx: number, instId: string, val: any, onSel: any, tId: number, isSplit?: boolean, sub?: 0 | 1) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}
