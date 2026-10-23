/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types d'interface pour le hook de clavier de grille de motif (< 30 lignes).
 */

export interface UsePatternGridKeyboardParams {
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedSubIndex: 0 | 1 | null;
  selectedStepIsPreRoll?: boolean;
  pattern: { id: number; steps?: number; activeSteps?: any[] } | null | undefined;
  trackId: number;
  isVoice: boolean;
  selectedVariationId?: string | null;
  handleVariationStepValueChange: (tId: number, pId: number, varId: string, idx: number, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: number, val: any) => void;
  handleVoiceStepClear: (tId: number, pId: number, idx: number, isPreRoll?: boolean) => void;
  focusVoiceStep: (idx: number, type?: 'note' | 'syl', isPreRoll?: boolean) => void;
  focusCell: (idx: number, subIndex?: 0 | 1 | null) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}
