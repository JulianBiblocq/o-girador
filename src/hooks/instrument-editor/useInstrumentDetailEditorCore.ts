import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { canTransferPatterns, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { useCloudAudioBounce } from '../useCloudAudioBounce';
import { useEditorResolvedTrackContext } from './useEditorResolvedTrackContext';
import { useInstrumentEditorTracksMeta } from './useInstrumentEditorTracksMeta';
import { useInstrumentEditorRecording } from './useInstrumentEditorRecording';
import { useInstrumentEditorSoloPlayback } from './useInstrumentEditorSoloPlayback';
import { useInstrumentEditorPatterns } from './useInstrumentEditorPatterns';
import { useInstrumentEditorCloudActions } from './useInstrumentEditorCloudActions';
import { useInstrumentDetailEditorController } from './useInstrumentDetailEditorController';
import { useInstrumentDetailEditorState } from './useInstrumentDetailEditorState';
import { useInstrumentEditorShortcuts } from './useInstrumentEditorShortcuts';
import { useEditorUnifiedStepShortcuts } from './useEditorUnifiedStepShortcuts';
import { useEditorPatternCardProps } from './useEditorPatternCardProps';

export function useInstrumentDetailEditorCore(props: {
  trackId: number; onClose: () => void; isMobile: boolean; isDetached?: boolean;
  onStepTouchStart?: any; setEditingTrackId: (id: number | null) => void;
}) {
  const { trackId, onClose, isMobile, isDetached = false, onStepTouchStart, setEditingTrackId } = props;
  const sequencer = useSequencer(), audio = useAudio(), { userProfile } = useAuth();
  const { genererEtUploaderCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const { lang, isLeftHanded, totalMeasures, handleTrackBalancoChange, handlePatternBalancoChange, editorDeepLink, consumeEditorDeepLink } = useSequencerStore(useShallow((s) => ({
    lang: s.lang, isLeftHanded: s.isLeftHanded, totalMeasures: s.totalMeasures,
    handleTrackBalancoChange: s.handleTrackBalancoChange, handlePatternBalancoChange: s.handlePatternBalancoChange,
    editorDeepLink: s.editorDeepLink, consumeEditorDeepLink: s.consumeEditorDeepLink,
  })));
  const currentBpm = useSequencerStore((s) => s.measureBpms[0] || 100);
  const currentTimeSig = useSequencerStore((s) => s.measureTimeSigs[0] || '4/4');
  const balancoPresets = useBalancoStore((s) => s.presets), globalSwing = useTransportStore((s) => s.globalSwing);
  const isSettingsOpen = useSequencerSettingsStore((s) => s.isSettingsOpen);

  const {
    track, effectiveEditTrackId, effectiveTrack, instSourceTrack, inst, isSlave, targetBalancoTrack,
    displayedPatterns, isVocalContext, puxTrack, coroTrack, isCoroActive,
  } = useEditorResolvedTrackContext(trackId, editorDeepLink?.patternId);

  const resolvedTargetInstId = useSequencerStore(
    useCallback((s) => resolveTrackInstrumentId(effectiveTrack ?? track, s.tracks) || inst?.id || '', [effectiveTrack, track, inst?.id])
  );

  const { tracksMeta, visibleTrackIds, trackDisplayName, getPatternUsage } = useInstrumentEditorTracksMeta(instSourceTrack, effectiveEditTrackId, inst);
  const { isPatternRecording, togglePatternRecording, armedPatternId, toggleArmPattern } = useInstrumentEditorRecording({ trackId: effectiveEditTrackId });
  const { onPlaySoloPattern, onStopSoloPattern, soloPatternPlayId, soloPatternVariationId } = useInstrumentEditorSoloPlayback();
  const ctrl = useInstrumentDetailEditorController(onClose, isMobile, isDetached);
  const patternOps = useInstrumentEditorPatterns({ effectiveEditTrackId, totalMeasures, lang, sequencer, setSelectedPatternId: (id) => editorState.setSelectedPatternId(id) });
  const cloud = useInstrumentEditorCloudActions({
    inst: { id: resolvedTargetInstId || inst.id }, displayedPatterns, currentBpm, currentTimeSig, lang, sequencer,
    genererEtUploaderCloudBounce, onLoadLibraryPattern: (targetId, libPtn) => sequencer.handleLoadLibraryPattern(effectiveEditTrackId, targetId, libPtn),
  });
  const clipboard = useSequencerStore(useShallow((s) => ({
    canPaste: Boolean(s.copiedPattern && s.copiedPattern.steps > 0 && canTransferPatterns(s.copiedPattern, resolvedTargetInstId, s.tracks)),
    canPasteRange: Boolean(s.stepRangeClipboard?.steps?.length && canTransferPatterns(s.stepRangeClipboard, resolvedTargetInstId, s.tracks)),
    copyAll: s.copyAllTrackPatterns, pasteAll: s.pasteAllTrackPatterns, clipboard: s.instrumentPatternsClipboard,
    isPasteable: Boolean(s.instrumentPatternsClipboard?.patterns?.length && canTransferPatterns(s.instrumentPatternsClipboard, resolvedTargetInstId, s.tracks)),
  })));

  const editorState = useInstrumentDetailEditorState({
    track: effectiveTrack, inst, effectiveEditTrackId, trackId, displayedPatterns, setEditingTrackId,
    handleDuplicatePattern: patternOps.handleDuplicatePattern, handleClearPatternStrokes: patternOps.handleClearPatternStrokes,
    handleContextDeletePattern: patternOps.handleContextDeletePattern,
    onCopyPattern: (p) => sequencer.handleCopyPattern(p, effectiveEditTrackId),
    onPastePattern: (pId) => sequencer.handlePastePattern(effectiveEditTrackId, pId), canPaste: clipboard.canPaste, lang, isVocalContext,
    editorDeepLink, consumeEditorDeepLink, isMobile, isInspectorMobileOpen: ctrl.isInspectorMobileOpen,
    setIsInspectorMobileOpen: ctrl.setIsInspectorMobileOpen, puxTrack, coroTrack,
  });

  const clearStepSelection = useCallback(() => {
    editorState.setIsMultiSelectActive(false);
    editorState.setSelectedStepIndices([]);
    editorState.setSelectedStepIdx(null);
    editorState.setSelectedSubIndex(null);
    useSequencerStore.getState().setSelectedStepRange(null);
  }, [editorState.setIsMultiSelectActive, editorState.setSelectedStepIndices, editorState.setSelectedStepIdx, editorState.setSelectedSubIndex]);

  useEditorUnifiedStepShortcuts({
    effectiveEditTrackId, isVocalContext, displayedPatterns, selectedPatternId: editorState.selectedPatternId,
    selectedVariationId: editorState.selectedVariationId, selectedStepIdx: editorState.selectedStepIdx,
    selectedStepIndices: editorState.selectedStepIndices, selectedStepIsPreRoll: editorState.selectedStepIsPreRoll,
    isMultiSelectActive: editorState.isMultiSelectActive, setSelectedStepIdx: editorState.setSelectedStepIdx,
    setSelectedStepIndices: editorState.setSelectedStepIndices, setSelectedSubIndex: editorState.setSelectedSubIndex,
    setSelectedStepIsPreRoll: editorState.setSelectedStepIsPreRoll,
  });

  useInstrumentEditorShortcuts({
    isSettingsOpen, isVocalContext, track: effectiveTrack, inst, lang, isLeftHanded, selectedStepIdx: editorState.selectedStepIdx,
    selectedStepIndices: editorState.selectedStepIndices, isMultiSelectActive: editorState.isMultiSelectActive, onClearStepSelection: clearStepSelection,
    activeTool: editorState.activeTool, setActiveTool: editorState.setActiveTool, setIsAlternating: editorState.setIsAlternating, handleClose: ctrl.handleClose,
    puxTrack, coroTrack, isCoroActive, handleSwitchVocalTrack: editorState.handleSwitchVocalTrack,
  });

  const cardProps = useEditorPatternCardProps({
    isVocalContext, track: effectiveTrack, inst, effectiveEditTrackId, totalPatternsCount: displayedPatterns.length,
    editorState, onStepTouchStart, sequencer, clipboard, isLeftHanded, lang, isMobile, armedPatternId,
    toggleArmPattern, ctrl, patternOps, soloPatternPlayId, soloPatternVariationId, onPlaySoloPattern, onStopSoloPattern, displayedPatterns, globalSwing,
  });

  return {
    track: effectiveTrack ?? track, inst, effectiveEditTrackId, effectiveTrack, targetBalancoTrack, displayedPatterns, lang, isLeftHanded,
    isSlave, isVocalContext, isCoroActive, puxTrack, coroTrack, tracksMeta, visibleTrackIds, trackDisplayName,
    getPatternUsage, isPatternRecording, togglePatternRecording, armedPatternId, toggleArmPattern, soloPatternPlayId,
    soloPatternVariationId, onPlaySoloPattern, onStopSoloPattern, balancoPresets, handleTrackBalancoChange,
    handlePatternBalancoChange, sequencer, userProfile, genererEtUploaderCloudBounce, isBouncingCloud, currentBpm,
    currentTimeSig, clipboard, ctrl, patternOps, cloud, editorState, cardProps, isDetached, isMobile, audio, clearStepSelection,
  };
}
