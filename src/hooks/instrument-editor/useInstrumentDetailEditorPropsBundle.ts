import { useMemo, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useVocalInspectorActions } from './useVocalInspectorActions';

export function useInstrumentDetailEditorPropsBundle(core: any, props: any) {
  const {
    track, inst, effectiveEditTrackId, effectiveTrack, targetBalancoTrack, displayedPatterns,
    lang, isLeftHanded, isSlave, isVocalContext, isCoroActive, puxTrack, coroTrack,
    tracksMeta, visibleTrackIds, trackDisplayName, getPatternUsage, isPatternRecording,
    togglePatternRecording, balancoPresets, handleTrackBalancoChange, handlePatternBalancoChange,
    sequencer, userProfile, genererEtUploaderCloudBounce, isBouncingCloud, currentBpm,
    currentTimeSig, clipboard, ctrl, patternOps, cloud, editorState, cardProps,
  } = core;
  const { trackId, setEditingTrackId } = props;

  const activePatternId = editorState.selectedPatternId || displayedPatterns[0]?.id;
  const activePattern = useMemo(
    () => displayedPatterns.find((p: any) => p.id === activePatternId) || displayedPatterns[0],
    [displayedPatterns, activePatternId]
  );

  const hasVocalRecording = useAudioStore(
    useCallback(
      (s) => {
        if (!activePatternId) return false;
        const canonicalKey = `${effectiveEditTrackId}_${activePatternId}`;
        return Boolean(
          s.vocalBuffers[canonicalKey] ||
          s.vocalBlobs[canonicalKey] ||
          s.vocalBuffers[activePatternId] ||
          s.vocalBlobs[activePatternId] ||
          activePattern?.hasVocalAudio ||
          activePattern?.vocalClip
        );
      },
      [effectiveEditTrackId, activePatternId, activePattern]
    )
  );

  const { onOpenAlignment, onImportAudio } = useVocalInspectorActions(
    effectiveEditTrackId, editorState.selectedPatternId, displayedPatterns[0]?.id
  );

  const headerProps = {
    inst, trackDisplayName, isVocalContext, puxTrack, coroTrack, isCoroActive,
    onSwitchVocalTrack: editorState.handleSwitchVocalTrack, visibleTrackIds,
    activeTrackId: trackId, onSelectTrack: setEditingTrackId, onContextMenu: ctrl.handleOpenContextMenu,
    addBtnRef: ctrl.addBtnRef, isAddPickerOpen: ctrl.isAddPickerOpen, onToggleAddPicker: ctrl.handleToggleAddPicker,
    targetBalancoTrack, effectiveEditTrackId, balancoPresets, handleTrackBalancoChange,
    isPatternRecording, togglePatternRecording, isMute: track?.isMute ?? false, isSolo: track?.isSolo ?? false,
    onMuteToggle: useCallback(() => sequencer.handleTrackMuteToggle(trackId), [trackId, sequencer]),
    onSoloToggle: useCallback(() => sequencer.handleTrackSoloToggle(trackId), [trackId, sequencer]),
    onClose: ctrl.handleClose, isClosing: ctrl.isClosing, lang,
    selectedPatternId: editorState.selectedPatternId, activePatternId: displayedPatterns[0]?.id,
    onOpenInspectorMobile: () => ctrl.setIsInspectorMobileOpen(true),
  };

  const patternListProps = {
    containerRef: ctrl.containerRef, isSlave, lang, sensors: ctrl.sensors,
    handleDragEnd: ({ active, over }: any) => {
      if (over && active.id !== over.id) {
        patternOps.onReorderPatternsDnd(displayedPatterns.findIndex((p: any) => p.id === active.id), displayedPatterns.findIndex((p: any) => p.id === over.id));
      }
    },
    patternIds: useMemo(() => displayedPatterns.map((p: any) => p.id), [displayedPatterns]),
    displayedPatterns, selectedPatternId: editorState.selectedPatternId, track, getPatternUsage, tracksMeta,
    onAddPattern: patternOps.onAddPattern, canPaste: clipboard.canPaste,
    onPasteAsNewPattern: () => sequencer.handlePastePattern(effectiveEditTrackId),
    copyAllTrackPatterns: clipboard.copyAll, pasteAllTrackPatterns: clipboard.pasteAll,
    isAllPatternsPasteable: clipboard.isPasteable, instrumentPatternsClipboard: clipboard.clipboard,
    effectiveTrack, inst, effectiveEditTrackId, cardProps,
  };

  const acousticDrawersProps = {
    trackId: effectiveEditTrackId, inst, lang, isLeftHanded, activeTool: editorState.activeTool,
    patternId: activePatternId, patterns: displayedPatterns,
    canPaste: clipboard.canPaste, balancoPresets, onSelectPattern: (pId: number) => editorState.setSelectedPatternId(pId),
    onAddPattern: patternOps.onAddPattern,
    onCopyPattern: () => sequencer.handleCopyPattern(activePattern),
    onPastePattern: () => sequencer.handlePastePattern(effectiveEditTrackId, activePatternId),
    onSavePattern: () => {
      cloud.setSaveModalPatternId(activePatternId);
      cloud.setSavePatternName(activePattern?.name || '');
      cloud.setSavePatternFolder(cloud.existingFolders[0] || 'Général');
    },
    onLoadPattern: () => cloud.setLoadModalPatternId(activePatternId),
    onDeletePattern: patternOps.onDeletePattern, onBalancoChange: handlePatternBalancoChange,
    isVoice: isVocalContext, hasVocalRecording,
    onOpenAlignment, onImportAudio,
    isInspectorMobileOpen: ctrl.isInspectorMobileOpen, setIsInspectorMobileOpen: ctrl.setIsInspectorMobileOpen,
  };

  const bottomDockProps = {
    isVocalContext, effectiveEditTrackId, patternId: activePatternId || 0,
    selectedStepIdx: editorState.selectedStepIdx, setSelectedStepIdx: editorState.setSelectedStepIdx,
    selectedStepIsPreRoll: editorState.selectedStepIsPreRoll, setSelectedStepIsPreRoll: editorState.setSelectedStepIsPreRoll,
    lang, patternSteps: displayedPatterns[0]?.steps || 16, inst, isLeftHanded, activeTool: editorState.activeTool,
    handleDockSelectTool: (tool: string) => editorState.setActiveTool(tool), isAlternating: editorState.isAlternating,
    onToggleAlternating: () => editorState.setIsAlternating((p: boolean) => !p), onOpenBottomSheet: () => ctrl.setIsInspectorMobileOpen(true),
  };

  const modalsAndMenusProps = {
    loadModalProps: {
      loadModalPatternId: cloud.loadModalPatternId, onClose: () => cloud.setLoadModalPatternId(null),
      lang, trackDisplayName, existingFolders: cloud.existingFolders, existingLibraryPatterns: cloud.existingLibraryPatterns,
      expandedFolders: cloud.expandedFolders, toggleFolder: cloud.toggleFolder,
      handleLoadPatternFromLibrary: cloud.handleLoadPatternFromLibrary, handleDeleteCloudPattern: cloud.handleDeleteCloudPattern,
      genererEtUploaderCloudBounce, currentBpm, currentTimeSig, setCloudPatterns: cloud.setCloudPatterns,
    },
    saveModalProps: {
      saveModalPatternId: cloud.saveModalPatternId, onClose: () => cloud.setSaveModalPatternId(null),
      lang, savePatternName: cloud.savePatternName, setSavePatternName: cloud.setSavePatternName,
      savePatternFolder: cloud.savePatternFolder, setSavePatternFolder: cloud.setSavePatternFolder,
      existingFolders: cloud.existingFolders, savePatternVisibility: cloud.savePatternVisibility,
      setSavePatternVisibility: cloud.setSavePatternVisibility, userProfile,
      isGroupMemberOrEditor: false, autoGeneratePatternAudio: cloud.autoGeneratePatternAudio,
      setAutoGeneratePatternAudio: cloud.setAutoGeneratePatternAudio, isSavingPattern: cloud.isSavingPattern,
      isBouncingCloud, handleSavePatternToLibrary: cloud.handleSavePatternToLibrary,
    },
    toastMessage: cloud.toastMessage, contextMenuPos: ctrl.contextMenuPos,
    handleCloseContextMenu: ctrl.handleCloseContextMenu, isAddPickerOpen: ctrl.isAddPickerOpen,
    addPickerAnchorRect: ctrl.addPickerAnchorRect,
    handleAddInstrumentFromRibbon: (idx: number) => {
      const currentM = useSequencerStore.getState().currentMeasure || 0;
      const addFn = sequencer.handleAddTrackInstrument || sequencer.handleAddTrack;
      const newTrackId = addFn ? addFn(idx, currentM) : undefined;
      if (newTrackId !== undefined && newTrackId !== null) setEditingTrackId(newTrackId);
      ctrl.handleCloseAddPicker();
    },
    handleCloseAddPicker: ctrl.handleCloseAddPicker,
    patternCardContextMenu: ctrl.patternCardContextMenu,
    getPatternCardMenuItems: editorState.getPatternCardMenuItems,
    setPatternCardContextMenu: ctrl.setPatternCardContextMenu,
    lang,
  };

  return { headerProps, patternListProps, acousticDrawersProps, bottomDockProps, modalsAndMenusProps };
}
