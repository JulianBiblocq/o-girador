
import React from 'react';
import { Pattern, Track } from '../../types';
import { useGridSwingOffsets } from './useGridSwingOffsets';
import { useGridScissorsLogic } from './useGridScissorsLogic';
import { useGridClearStep } from './useGridClearStep';
import { useGridPointerInteractions } from './useGridPointerInteractions';
import { useGridTouchInteractions } from './useGridTouchInteractions';
import { useGridWheelNuances } from './useGridWheelNuances';
import { useGridCellKeyboardNav } from './useGridCellKeyboardNav';
import { clearVoiceMainStep, clearVoicePreRollStep } from './voiceClearHelpers';

interface UseGridPercussionHooksParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  track?: Track;
  instrument: { id: string; type: string; [key: string]: any };
  activeTool: string;
  isAlternating: boolean;
  lang: string;
  isLeftHanded: boolean;
  selectedPatternId: number;
  selectedVariationId: string | null;
  selectedStepIdx: number | null;
  isMultiSelectActive: boolean;
  focusCell: (stepIdx: number, subIndex?: 0 | 1 | null) => void;
  handleStepTouchStartMulti: (e: any, idx: number) => void;
  handleStepMouseDownMulti: (e: any, idx: number, force?: boolean) => void;
  handleStepMouseEnterMulti: (idx: number) => void;
  onStepTouchStart?: (e: any, pId: number, sIdx: number, instId: string, val: any, onSel: any, tId: number, isSplit?: boolean, sub?: 0 | 1) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  handleTrackStepKeyDown: (tId: number, pId: number, idx: number, key: string, val: string, el: any) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
  setSelectedPatternId: (pId: number) => void;
  setSelectedVariationId: (vId: string | null) => void;
  setIsMultiSelectActive: (active: boolean) => void;
  setSelectedStepIsPreRoll?: (isPre: boolean) => void;
  setContextMenu: (menu: any) => void;
}

export function useGridPercussionHooks(params: UseGridPercussionHooksParams) {
  const { swingOffsets } = useGridSwingOffsets({ pattern: params.pattern, track: params.track });
  const handleScissorsClick = useGridScissorsLogic({
    trackId: params.trackId, pattern: params.pattern, instrument: params.instrument,
    isLeftHanded: params.isLeftHanded, selectedVariationId: params.selectedVariationId,
    handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange,
    setSelectedStepIdx: params.setSelectedStepIdx, setSelectedStepIndices: params.setSelectedStepIndices,
    setSelectedSubIndex: params.setSelectedSubIndex
  });

  const { handleClearStep } = useGridClearStep({
    trackId: params.trackId, pattern: params.pattern, selectedVariationId: params.selectedVariationId,
    selectedStepIdx: params.selectedStepIdx, handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange, setSelectedSubIndex: params.setSelectedSubIndex,
    setSelectedStepIdx: params.setSelectedStepIdx, setSelectedStepIsPreRoll: params.setSelectedStepIsPreRoll,
    setVoiceStepContextMenu: params.setContextMenu
  });

  const { handleCellMouseDown, handleCellMouseEnter } = useGridPointerInteractions({
    trackId: params.trackId, pattern: params.pattern, instrument: params.instrument,
    activeTool: params.activeTool, isAlternating: params.isAlternating, lang: params.lang,
    isLeftHanded: params.isLeftHanded, selectedVariationId: params.selectedVariationId,
    isMultiSelectActive: params.isMultiSelectActive, handleScissorsClick, handleClearStep,
    handleStepMouseDownMulti: params.handleStepMouseDownMulti, handleStepMouseEnterMulti: params.handleStepMouseEnterMulti,
    handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange, setSelectedStepIdx: params.setSelectedStepIdx,
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedSubIndex: params.setSelectedSubIndex,
    setSelectedPatternId: params.setSelectedPatternId, setSelectedVariationId: params.setSelectedVariationId,
    setIsMultiSelectActive: params.setIsMultiSelectActive
  });

  const { handleCellTouchStart, handleCellTouchMove, handleCellTouchEnd } = useGridTouchInteractions({
    trackId: params.trackId, pattern: params.pattern, instrument: params.instrument,
    activeTool: params.activeTool, isAlternating: params.isAlternating, lang: params.lang,
    isLeftHanded: params.isLeftHanded, selectedVariationId: params.selectedVariationId,
    isMultiSelectActive: params.isMultiSelectActive, handleScissorsClick,
    handleStepTouchStartMulti: params.handleStepTouchStartMulti, onStepTouchStart: params.onStepTouchStart,
    handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange, setSelectedStepIdx: params.setSelectedStepIdx,
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedSubIndex: params.setSelectedSubIndex
  });

  useGridWheelNuances({
    gridRef: params.gridRef, trackId: params.trackId, pattern: params.pattern,
    selectedPatternId: params.selectedPatternId, selectedVariationId: params.selectedVariationId,
    instrument: params.instrument, lang: params.lang, isLeftHanded: params.isLeftHanded,
    handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange, setSelectedStepIdx: params.setSelectedStepIdx,
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedSubIndex: params.setSelectedSubIndex
  });

  const handleCellKeyDown = useGridCellKeyboardNav({
    trackId: params.trackId, pattern: params.pattern, activeTool: params.activeTool,
    selectedVariationId: params.selectedVariationId, instrument: params.instrument,
    lang: params.lang, isLeftHanded: params.isLeftHanded, focusCell: params.focusCell,
    handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange,
    handleTrackStepKeyDown: params.handleTrackStepKeyDown, setSelectedStepIdx: params.setSelectedStepIdx,
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedSubIndex: params.setSelectedSubIndex
  });

  return {
    swingOffsets, handleClearStep,
    handleVoiceStepClear: (tId: number, pId: number, idx: number, isPre?: boolean) => clearVoiceMainStep(tId, pId, idx, isPre),
    handleVoicePreRollStepClear: (tId: number, pId: number, idx: number) => clearVoicePreRollStep(tId, pId, idx),
    handleCellMouseDown, handleCellMouseEnter, handleCellTouchStart, handleCellTouchMove,
    handleCellTouchEnd, handleCellKeyDown
  };
}
