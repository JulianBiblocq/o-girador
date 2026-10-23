/**
 * Types d'interface pour les interactions de sélection multiple dans la grille (< 25 lignes).
 */

import React from 'react';
import { Pattern } from '../../types';

export interface UseGridMultiSelectInteractionsParams {
  trackId: number;
  pattern: Pattern;
  instrumentId: string;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  onStepTouchStart?: (e: any, pId: number, sIdx: number, instId: string, val: any, onSel: any, tId: number) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedStepIdx: (idx: number) => void;
}
