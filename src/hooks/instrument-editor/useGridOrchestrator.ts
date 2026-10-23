/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { InstrumentPatternGridProps } from '../../components/instrument-editor/grid/gridTypes';
import { VoiceStepContextMenuState } from '../../components/instrument-editor/grid/VoiceStepContextMenuModal';
import { getGlobalClipboard, copyRelativeSteps, pasteRelativeSteps } from './relativeClipboardHelpers';
import { isStepInRange } from './gridStepRangeHelper';
import { useGridMultiSelectInteractions } from './useGridMultiSelectInteractions';
import { useGridPercussionHooks } from './useGridPercussionHooks';
import { useGridVoiceAndShortcutsHooks } from './useGridVoiceAndShortcutsHooks';

export function useGridOrchestrator(props: InstrumentPatternGridProps) {
  const {
    trackId, pattern, instrument, selectedPatternId, selectedStepIdx,
    selectedStepIndices, selectedVariationId, selectedSubIndex: propSub,
    setSelectedSubIndex: propSetSub, isTupletEditMode, isMultiSelectActive,
    selectedStepIsPreRoll, setSelectedStepIsPreRoll, setSelectedPatternId,
    setSelectedStepIdx, setSelectedVariationId, setSelectedStepIndices,
    setIsMultiSelectActive, activeTool = 'D', isAlternating = false, onStepTouchStart
  } = props;

  const {
    lang, isLeftHanded, handleTrackStepValueChange, handleTrackStepKeyDown,
    handleVoiceTypeToggle, handleVoiceSylChange, handleVoiceNoteChange,
    handleVoiceNoteBlur, handleVoicePreRollSylChange, handleVoicePreRollNoteBlur,
    handleTrackStepsChange, handleDeletePatternMeasure, handlePatternBeatResolutionChange,
    handleVariationStepValueChange
  } = useSequencer();

  const gridRef = useRef<HTMLDivElement>(null);
  const track = useSequencerStore(useCallback(s => s.tracks.find(t => t.id === trackId), [trackId]));
  const selectedStepRange = useSequencerStore(s => s.selectedStepRange);
  const handleSetPatternAllBeatsResolution = useSequencerStore(s => s.handleSetPatternAllBeatsResolution);
  const activeVigilanceFocus = usePaperVigilanceStore(s => s.activeFocusPoint && (!s.activeSequencerScoreId || s.activeFocusPoint.scoreId === s.activeSequencerScoreId) ? s.activeFocusPoint : null);

  const [internalSubIndex, setInternalSubIndex] = useState<0 | 1 | null>(null);
  const selectedSubIndex = propSub !== undefined ? propSub : internalSubIndex;
  const setSelectedSubIndex = propSetSub || setInternalSubIndex;
  const [contextMenu, setContextMenu] = useState<VoiceStepContextMenuState | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);

  const timeSig = (pattern as any)?.timeSignature || useSequencerStore.getState().metadata?.ritmo || '4/4';
  const isTuplet = Array.isArray(pattern?.beatResolutions) && pattern.beatResolutions.length >= 4 && pattern.beatResolutions.slice(0, 4).every(r => r === 3);
  const preRollLengthComputed = pattern?.preRollActiveSteps?.length || (isTuplet ? 12 : (timeSig === '12/8' ? 12 : 16));

  const focusCell = useCallback((stepIdx: number, sub?: 0 | 1 | null) => {
    if (!gridRef.current) return;
    if (sub !== undefined && sub !== null) (gridRef.current.querySelector(`[data-step-index="${stepIdx}"][data-sub-index="${sub}"]`) as HTMLElement | null)?.focus();
    else { const el = gridRef.current.querySelector(`input[data-step-index="${stepIdx}"]`) as HTMLInputElement | null; if (el) { el.focus(); el.select(); } }
  }, []);

  const handleSelectStepForSculpt = useCallback((idx: number, sub?: 0 | 1 | null) => {
    setSelectedStepIdx(idx); setSelectedStepIndices([idx]); setSelectedPatternId(pattern.id); setSelectedVariationId(null); setSelectedSubIndex(sub ?? null);
    useSequencerStore.setState({ selectedStepIdx: idx, selectedSubIndex: sub ?? null, selectedStepIsPreRoll: false });
  }, [setSelectedStepIdx, setSelectedStepIndices, setSelectedPatternId, setSelectedVariationId, setSelectedSubIndex, pattern.id]);

  const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, idx: number, value: any, subIndex?: 0 | 1) => {
    if (activeTool === 'scissors') { e.preventDefault(); return; }
    const newVal = e.target.value;
    let finalVal: string | [string, string] = String(newVal);
    if (subIndex !== undefined && Array.isArray(value)) {
      finalVal = [...value] as [string, string];
      finalVal[subIndex] = String(newVal);
    }
    if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal);
    else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal);
    const sId = usePaperVigilanceStore.getState().activeSequencerScoreId;
    const pt = usePaperVigilanceStore.getState().points.find(p => (!sId || p.scoreId === sId) && p.patternId === pattern.id && p.stepIndex === idx);
    if (pt) usePaperVigilanceStore.getState().removePoint(pt.id);
  }, [activeTool, selectedVariationId, trackId, pattern.id, handleVariationStepValueChange, handleTrackStepValueChange]);

  const multiInteractions = useGridMultiSelectInteractions({
    trackId, pattern, instrumentId: instrument.id, isMultiSelectActive, selectedStepIdx,
    selectedStepIndices, selectedVariationId, onStepTouchStart, handleVariationStepValueChange,
    handleTrackStepValueChange, setSelectedStepIndices, setSelectedStepIdx
  });

  const percHooks = useGridPercussionHooks({
    gridRef, trackId, pattern, track, instrument, activeTool, isAlternating, lang, isLeftHanded,
    selectedPatternId, selectedVariationId, selectedStepIdx, isMultiSelectActive, focusCell,
    handleStepTouchStartMulti: multiInteractions.handleStepTouchStartMulti,
    handleStepMouseDownMulti: multiInteractions.handleStepMouseDownMulti,
    handleStepMouseEnterMulti: multiInteractions.handleStepMouseEnterMulti, onStepTouchStart,
    handleVariationStepValueChange, handleTrackStepValueChange, handleTrackStepKeyDown, setSelectedStepIdx,
    setSelectedStepIndices, setSelectedSubIndex, setSelectedPatternId, setSelectedVariationId,
    setIsMultiSelectActive, setSelectedStepIsPreRoll, setContextMenu
  });

  const voiceHooks = useGridVoiceAndShortcutsHooks({
    gridRef, trackId, pattern, instrument, activeTool, lang, isLeftHanded, selectedPatternId,
    selectedVariationId, selectedStepIdx, selectedSubIndex, selectedStepIndices, selectedStepRange,
    selectedStepIsPreRoll, isMultiSelectActive, preRollLengthComputed, focusCell,
    handleStepMouseDownMulti: multiInteractions.handleStepMouseDownMulti,
    handleStepMouseEnterMulti: multiInteractions.handleStepMouseEnterMulti,
    handleVoiceStepClear: percHooks.handleVoiceStepClear,
    handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIdx,
    setSelectedStepIndices, setSelectedSubIndex, setSelectedStepIsPreRoll, setSelectedPatternId
  });

  useEffect(() => {
    setHasClipboard(!!getGlobalClipboard());
    const onChange = () => setHasClipboard(!!getGlobalClipboard());
    window.addEventListener('oGiradorClipboardChanged', onChange);
    return () => window.removeEventListener('oGiradorClipboardChanged', onChange);
  }, []);

  const handleVoiceContextMenu = useCallback((e: React.MouseEvent, stepIdx: number, isPreRoll?: boolean) => {
    e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, stepIdx, isPreRoll: Boolean(isPreRoll) });
  }, []);

  const handleVoiceTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, idx: number) => {
    if (isMultiSelectActive) multiInteractions.handleStepTouchStartMulti(e, idx);
  }, [isMultiSelectActive, multiInteractions.handleStepTouchStartMulti]);

  return {
    gridRef, lang, timeSig, swingOffsets: percHooks.swingOffsets, preRollLengthComputed, selectedSubIndex,
    selectedStepRange, activeVigilanceFocus, contextMenu, setContextMenu, hasClipboard, isStepInRange,
    focusVoiceStep: voiceHooks.focusVoiceStep, handleVoiceNav: voiceHooks.handleVoiceNav, handleVoiceFocusStep: voiceHooks.handleVoiceFocusStep,
    handleVoiceMouseDown: voiceHooks.handleVoiceMouseDown, handleVoicePreRollMouseDown: voiceHooks.handleVoicePreRollMouseDown, handleVoiceMouseEnter: voiceHooks.handleVoiceMouseEnter,
    handleCellMouseDown: percHooks.handleCellMouseDown, handleCellMouseEnter: percHooks.handleCellMouseEnter, handleCellTouchStart: percHooks.handleCellTouchStart,
    handleCellTouchMove: percHooks.handleCellTouchMove, handleCellTouchEnd: percHooks.handleCellTouchEnd, handleGridTouchMove: multiInteractions.handleGridTouchMove,
    handleGridTouchEnd: multiInteractions.handleGridTouchEnd, handleCellKeyDown: percHooks.handleCellKeyDown, handleCellChange, handleSelectStepForSculpt, handleClearStep: percHooks.handleClearStep,
    handleVoiceStepClear: percHooks.handleVoiceStepClear, handleVoicePreRollStepClear: percHooks.handleVoicePreRollStepClear,
    handlePatternBeatResolutionChange, handleSetPatternAllBeatsResolution, handleTrackStepsChange, handleVoiceContextMenu, handleVoiceTouchStart,
    handleDeletePatternMeasure: (tId: number, pId: number, mIdx: number) => handleDeletePatternMeasure(tId, pId, mIdx),
    handleCellContextMenu: (e: React.MouseEvent<any>, i: number, _val: any, subIndex?: 0 | 1) => percHooks.handleClearStep(i, subIndex),
    handleVoiceTypeToggle: (tId: number, pId: number, idx: number) => handleVoiceTypeToggle(tId, pId, idx), handleVoiceSylChange: (tId: number, pId: number, idx: number, val: string) => handleVoiceSylChange(tId, pId, idx, val),
    handleVoicePreRollSylChange: (tId: number, pId: number, idx: number, val: string) => handleVoicePreRollSylChange(tId, pId, idx, val), handleVoiceNoteChange: (tId: number, pId: number, idx: number, note: string) => handleVoiceNoteChange(tId, pId, idx, note),
    handleVoiceNoteBlur: (tId: number, pId: number, idx: number, note: string) => handleVoiceNoteBlur(tId, pId, idx, note), handleVoicePreRollNoteBlur: (tId: number, pId: number, idx: number, note: string) => handleVoicePreRollNoteBlur(tId, pId, idx, note),
    onCopyRelative: () => copyRelativeSteps(selectedStepIndices, pattern), onPasteRelative: () => pasteRelativeSteps(pattern, selectedStepIndices[0], instrument.id, trackId, selectedVariationId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIndices) };
}
