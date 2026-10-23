/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types d'interface pour la navigation clavier dans les cellules de grille (< 30 lignes).
 */

import { Pattern } from '../../types';

export interface UseGridCellKeyboardNavParams {
  trackId: number;
  pattern: Pattern;
  activeTool: string;
  selectedVariationId: string | null;
  instrument: { id: string; type: string; [key: string]: any };
  lang: string;
  isLeftHanded: boolean;
  focusCell: (stepIdx: number, subIndex?: 0 | 1 | null) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  handleTrackStepKeyDown: (tId: number, pId: number, idx: number, key: string, val: string, el: any) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}
