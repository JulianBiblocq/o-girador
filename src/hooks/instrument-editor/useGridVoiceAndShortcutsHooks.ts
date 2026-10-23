
import React from 'react';
import { Pattern } from '../../types';
import { useGridDuplicateShortcut } from './useGridDuplicateShortcut';
import { useGridNotesClipboard } from './useGridNotesClipboard';
import { useGridArrowNuanceShortcuts } from './useGridArrowNuanceShortcuts';
import { useGridMultiSelectKeyboard } from './useGridMultiSelectKeyboard';
import { useGridVoiceNavigation } from './useGridVoiceNavigation';
import { useGridVoiceMouseHandlers } from './useGridVoiceMouseHandlers';
import { useGridVoiceTick } from './useGridVoiceTick';
import { usePatternGridKeyboard } from '../editor/usePatternGridKeyboard';

interface UseGridVoiceAndShortcutsParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  instrument: { id: string; type: string; [key: string]: any };
  activeTool: string;
  lang: string;
  isLeftHanded: boolean;
  selectedPatternId: number;
  selectedVariationId: string | null;
  selectedStepIdx: number | null;
  selectedSubIndex: 0 | 1 | null;
  selectedStepIndices: number[];
  selectedStepRange: any;
  selectedStepIsPreRoll?: boolean;
  isMultiSelectActive: boolean;
  preRollLengthComputed: number;
  focusCell: (stepIdx: number, subIndex?: 0 | 1 | null) => void;
  handleStepMouseDownMulti: (e: any, idx: number) => void;
  handleStepMouseEnterMulti: (idx: number) => void;
  handleVoiceStepClear: (tId: number, pId: number, idx: number, isPre?: boolean) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
  setSelectedStepIsPreRoll?: (isPre: boolean) => void;
  setSelectedPatternId: (pId: number) => void;
}

export function useGridVoiceAndShortcutsHooks(params: UseGridVoiceAndShortcutsParams) {
  const isVoiceTrack = params.instrument.type === 'voice' || ['puxador', 'coro', 'toada'].includes(String(params.trackId));

  useGridDuplicateShortcut({
    gridRef: params.gridRef, trackId: params.trackId, pattern: params.pattern,
    selectedPatternId: params.selectedPatternId, selectedStepIdx: params.selectedStepIdx,
    selectedVariationId: params.selectedVariationId, instrument: params.instrument,
    currentWindow: undefined, setSelectedStepIdx: (idx: number) => params.setSelectedStepIdx(idx),
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedSubIndex: params.setSelectedSubIndex
  });

  useGridNotesClipboard({
    pattern: params.pattern, trackId: params.trackId, selectedPatternId: params.selectedPatternId,
    instrument: params.instrument, currentWindow: undefined
  });

  useGridArrowNuanceShortcuts({
    trackId: params.trackId, pattern: params.pattern, selectedPatternId: params.selectedPatternId,
    selectedVariationId: params.selectedVariationId, selectedStepIdx: params.selectedStepIdx,
    selectedSubIndex: params.selectedSubIndex, instrument: params.instrument, lang: params.lang,
    isLeftHanded: params.isLeftHanded, handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange
  });

  useGridMultiSelectKeyboard({
    isMultiSelectActive: params.isMultiSelectActive, selectedStepIndices: params.selectedStepIndices,
    patternId: params.pattern.id, selectedVariationId: params.selectedVariationId,
    trackId: params.trackId, currentWindow: undefined,
    handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange,
    setSelectedStepIndices: params.setSelectedStepIndices
  });

  const { focusVoiceStep, handleVoiceNav, handleVoiceFocusStep } = useGridVoiceNavigation({
    gridRef: params.gridRef, trackId: params.trackId, pattern: params.pattern,
    selectedPatternId: params.selectedPatternId, selectedStepIdx: params.selectedStepIdx,
    selectedStepIsPreRoll: params.selectedStepIsPreRoll, activeTool: params.activeTool,
    isMultiSelectActive: params.isMultiSelectActive, focusCell: params.focusCell,
    handleStepMouseDownMulti: params.handleStepMouseDownMulti,
    setSelectedStepIdx: (idx: number) => params.setSelectedStepIdx(idx),
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedStepIsPreRoll: params.setSelectedStepIsPreRoll,
    setSelectedPatternId: params.setSelectedPatternId, setSelectedSubIndex: params.setSelectedSubIndex
  });

  const { handleVoiceMouseDown, handleVoicePreRollMouseDown, handleVoiceMouseEnter } = useGridVoiceMouseHandlers({
    trackId: params.trackId, pattern: params.pattern, activeTool: params.activeTool,
    isMultiSelectActive: params.isMultiSelectActive, selectedStepIdx: params.selectedStepIdx,
    selectedStepIsPreRoll: params.selectedStepIsPreRoll, handleVoiceStepClear: params.handleVoiceStepClear,
    handleStepMouseDownMulti: params.handleStepMouseDownMulti, handleStepMouseEnterMulti: params.handleStepMouseEnterMulti,
    handleVoiceFocusStep
  });

  useGridVoiceTick({
    gridRef: params.gridRef, trackId: params.trackId, pattern: params.pattern,
    instrumentType: params.instrument.type
  });

  usePatternGridKeyboard({
    isMultiSelectActive: params.isMultiSelectActive, selectedStepIdx: params.selectedStepIdx,
    selectedSubIndex: params.selectedSubIndex, selectedStepIsPreRoll: params.selectedStepIsPreRoll,
    pattern: params.pattern, trackId: params.trackId, isVoice: isVoiceTrack,
    selectedVariationId: params.selectedVariationId, handleVariationStepValueChange: params.handleVariationStepValueChange,
    handleTrackStepValueChange: params.handleTrackStepValueChange, handleVoiceStepClear: params.handleVoiceStepClear,
    focusVoiceStep, focusCell: params.focusCell, setSelectedStepIdx: params.setSelectedStepIdx,
    setSelectedStepIndices: params.setSelectedStepIndices, setSelectedSubIndex: params.setSelectedSubIndex
  });

  return { focusVoiceStep, handleVoiceNav, handleVoiceFocusStep, handleVoiceMouseDown, handleVoicePreRollMouseDown, handleVoiceMouseEnter };
}
