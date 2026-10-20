/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SortablePatternCardProps } from '../../components/instrument-editor/patterns/patternCardTypes';
import { computeStepBalancoPercent } from '../../utils/balancoUtils';
import { Pattern } from '../../types';

export function useEditorPatternCardProps(params: {
  isVocalContext: boolean;
  track: any;
  inst: any;
  effectiveEditTrackId: number;
  totalPatternsCount: number;
  editorState: any;
  onStepTouchStart?: any;
  sequencer: any;
  clipboard: any;
  isLeftHanded: boolean;
  lang: any;
  isMobile: boolean;
  armedPatternId: number | null;
  toggleArmPattern: any;
  ctrl: any;
  patternOps: any;
  soloPatternPlayId?: number | null;
  soloPatternVariationId?: string | null;
  onPlaySoloPattern?: any;
  onStopSoloPattern?: any;
  displayedPatterns: Pattern[];
  globalSwing: any;
}): Omit<SortablePatternCardProps, 'ptn' | 'ptnIdx' | 'isSelected' | 'usage'> {
  const {
    isVocalContext, track, inst, effectiveEditTrackId, totalPatternsCount,
    editorState, onStepTouchStart, sequencer, clipboard, isLeftHanded,
    lang, isMobile, armedPatternId, toggleArmPattern, ctrl, patternOps,
    soloPatternPlayId, soloPatternVariationId, onPlaySoloPattern, onStopSoloPattern,
    displayedPatterns, globalSwing,
  } = params;

  return {
    isVocalContext, track, inst, effectiveEditTrackId, totalPatternsCount,
    selectedPatternId: editorState.selectedPatternId, setSelectedPatternId: editorState.setSelectedPatternId,
    selectedStepIdx: editorState.selectedStepIdx, setSelectedStepIdx: editorState.setSelectedStepIdx,
    selectedStepIndices: editorState.selectedStepIndices, setSelectedStepIndices: editorState.setSelectedStepIndices,
    selectedVariationId: editorState.selectedVariationId, setSelectedVariationId: editorState.setSelectedVariationId,
    selectedSubIndex: editorState.selectedSubIndex, setSelectedSubIndex: editorState.setSelectedSubIndex,
    isTupletEditMode: editorState.isTupletEditMode, isMultiSelectActive: editorState.isMultiSelectActive,
    setIsMultiSelectActive: editorState.setIsMultiSelectActive, selectedStepIsPreRoll: editorState.selectedStepIsPreRoll,
    setSelectedStepIsPreRoll: editorState.setSelectedStepIsPreRoll, onStepTouchStart,
    onCopyPattern: (p: Pattern) => sequencer.handleCopyPattern(p),
    onPastePattern: (pId: number) => sequencer.handlePastePattern(effectiveEditTrackId, pId),
    canPaste: clipboard.canPaste, activeTool: editorState.activeTool, isAlternating: editorState.isAlternating,
    isLeftHanded, isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    lang, isMobile, armedPatternId, toggleArmPattern,
    editingPatternId: ctrl.editingPatternId, editName: ctrl.editName,
    setEditingPatternId: ctrl.setEditingPatternId, setEditName: ctrl.setEditName,
    handleSaveName: (pId: number) => sequencer.handlePatternNameChange(effectiveEditTrackId, pId, ctrl.editName),
    onSelectPattern: (pId: number) => editorState.setSelectedPatternId(pId), onDeletePattern: patternOps.onDeletePattern,
    onStepsChange: (pId: number, s: number) => sequencer.handleTrackStepsChange(effectiveEditTrackId, pId, s),
    soloPatternPlayId: soloPatternPlayId ?? null, soloPatternVariationId: soloPatternVariationId ?? null, onPlaySoloPattern, onStopSoloPattern,
    onTogglePatternVariationFirstTimeOnly: (pId: number, vId: string, val: boolean) => sequencer.handleTogglePatternVariationFirstTimeOnly?.(effectiveEditTrackId, pId, vId, val),
    onUpdatePatternVariationProbability: (pId: number, vId: string, pr: number) => sequencer.handleUpdatePatternVariationProbability?.(effectiveEditTrackId, pId, vId, pr),
    onDeletePatternVariation: (pId: number, vId: string) => sequencer.handleDeletePatternVariation?.(effectiveEditTrackId, pId, vId),
    onVariationStepValueChange: (pId: number, vId: string, sIdx: any, val: any) => sequencer.handleVariationStepValueChange?.(effectiveEditTrackId, pId, vId, sIdx, val),
    onAddPatternVariation: (pId: number) => sequencer.handleAddPatternVariation?.(effectiveEditTrackId, pId),
    getStepSwingPercent: (stepIdx, steps, beatResolutions) => computeStepBalancoPercent({
      stepIdx, steps, beatResolutions, track,
      pattern: displayedPatterns.find((p) => p.id === editorState.selectedPatternId) || displayedPatterns[0],
      globalSwing,
    }),
    patternDOMRefs: ctrl.patternDOMRefs, badgeDOMRefs: ctrl.badgeDOMRefs,
    onOpenContextMenu: (p: Pattern, x: number, y: number) => ctrl.setPatternCardContextMenu({ pattern: p, x, y }),
  };
}
