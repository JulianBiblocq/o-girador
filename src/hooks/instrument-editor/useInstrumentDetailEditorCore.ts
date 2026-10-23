
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore, isToadaBus, isToadaChild } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCloudAudioBounce } from '../useCloudAudioBounce';
import { instrumentsConfig } from '../../data';
import { useInstrumentEditorTracksMeta } from './useInstrumentEditorTracksMeta';
import { useInstrumentEditorRecording } from './useInstrumentEditorRecording';
import { useInstrumentEditorSoloPlayback } from './useInstrumentEditorSoloPlayback';
import { useInstrumentEditorPatterns } from './useInstrumentEditorPatterns';
import { useInstrumentEditorCloudActions } from './useInstrumentEditorCloudActions';
import { useInstrumentDetailEditorController } from './useInstrumentDetailEditorController';
import { useInstrumentDetailEditorState } from './useInstrumentDetailEditorState';
import { useInstrumentEditorShortcuts } from './useInstrumentEditorShortcuts';
import { useEditorPatternCardProps } from './useEditorPatternCardProps';

export function useInstrumentDetailEditorCore(props: {
  trackId: number; onClose: () => void; isMobile: boolean; isDetached?: boolean;
  onStepTouchStart?: any; setEditingTrackId: (id: number | null) => void;
}) {
  const { trackId, onClose, isMobile, isDetached = false, onStepTouchStart, setEditingTrackId } = props;
  const sequencer = useSequencer();
  const audio = useAudio();
  const { userProfile } = useAuth();
  const { genererEtUploaderCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const lang = useSequencerStore((s) => s.lang);
  const isLeftHanded = useSequencerStore((s) => s.isLeftHanded);
  const totalMeasures = useSequencerStore((s) => s.totalMeasures);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const currentBpm = useSequencerStore((s) => s.measureBpms[0] || 100);
  const currentTimeSig = useSequencerStore((s) => s.measureTimeSigs[0] || '4/4');
  const track = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === trackId), [trackId]));
  const balancoPresets = useBalancoStore((s) => s.presets);
  const globalSwing = useTransportStore((s) => s.globalSwing);
  const isSettingsOpen = useSequencerSettingsStore((s) => s.isSettingsOpen);
  const handleTrackBalancoChange = useSequencerStore((s) => s.handleTrackBalancoChange);
  const handlePatternBalancoChange = useSequencerStore((s) => s.handlePatternBalancoChange);

  const isSlave = Boolean(track?.linkedToTrackId && !track?.isLinkMaster);
  const isToada = Boolean(track && (isToadaBus(track) || track.customName === 'Toada' || track.instrumentIdx === 12));
  const toadaConfig = instrumentsConfig.find((i) => i.id === 'toada') || instrumentsConfig[12];
  const inst = track ? (isToada && toadaConfig ? toadaConfig : instrumentsConfig[track.instrumentIdx]) : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };

  const activeVocalChildTrack = useSequencerStore(useCallback((state) => {
    if (!track || !isToada) return undefined;
    const pux = state.tracks.find((t) => isToadaChild(t, state.tracks) && instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = state.tracks.find((t) => isToadaChild(t, state.tracks) && instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    const gId = useAudioStore.getState().selectedVocalPatternId;
    if (gId) {
      if (pux && pux.patterns.some((p) => p.id === gId)) return pux;
      if (coro && coro.patterns.some((p) => p.id === gId)) return coro;
    }
    return coro?.patterns?.find((p) => p.measureAssignments?.[currentMeasure]) ? coro : pux;
  }, [track, isToada, currentMeasure]));

  const effectiveEditTrackId = (isToada && (!track?.patterns || track.patterns.length === 0) && activeVocalChildTrack) ? activeVocalChildTrack.id : trackId;
  const effectiveTrack = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === effectiveEditTrackId) || track, [effectiveEditTrackId, track]));
  const targetBalancoTrack = effectiveTrack;
  const displayedPatterns = effectiveTrack?.patterns || [];

  const { puxTrack, coroTrack } = useSequencerStore(useShallow((s) => ({
    puxTrack: s.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador' || t.customName === 'Puxador'),
    coroTrack: s.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro' || t.customName === 'Coro'),
  })));

  const isVocalContext = Boolean(isToada || String(track?.id) === 'puxador' || String(track?.id) === 'coro' || (track as any)?.type === 'voice' || inst?.type === 'voice' || track?.customName === 'Toada' || track?.customName === 'Puxador' || track?.customName === 'Coro');
  const isCoroActive = Boolean(effectiveEditTrackId === coroTrack?.id || String(track?.id) === 'coro' || inst?.id === 'coro' || track?.customName === 'Coro');

  const { tracksMeta, visibleTrackIds, trackDisplayName, getPatternUsage } = useInstrumentEditorTracksMeta(track, trackId, inst);
  const { isPatternRecording, togglePatternRecording, armedPatternId, toggleArmPattern } = useInstrumentEditorRecording({ trackId });
  const { onPlaySoloPattern, onStopSoloPattern, soloPatternPlayId, soloPatternVariationId } = useInstrumentEditorSoloPlayback();
  const ctrl = useInstrumentDetailEditorController(onClose);

  const patternOps = useInstrumentEditorPatterns({
    effectiveEditTrackId, totalMeasures, lang, sequencer,
    setSelectedPatternId: (id) => editorState.setSelectedPatternId(id),
  });

  const cloud = useInstrumentEditorCloudActions({
    inst, displayedPatterns, currentBpm, currentTimeSig, lang, sequencer, genererEtUploaderCloudBounce,
    onLoadLibraryPattern: (targetId, libPtn) => sequencer.handleLoadLibraryPattern(effectiveEditTrackId, targetId, libPtn),
  });

  const clipboard = useSequencerStore(useShallow((s) => ({
    canPaste: Boolean(s.copiedPattern && s.copiedPattern.steps > 0),
    copyAll: s.copyAllTrackPatterns, pasteAll: s.pasteAllTrackPatterns,
    clipboard: s.instrumentPatternsClipboard, isPasteable: Boolean(s.instrumentPatternsClipboard?.patterns?.length),
  })));

  const editorState = useInstrumentDetailEditorState({
    track, effectiveEditTrackId, trackId, displayedPatterns, setEditingTrackId,
    handleDuplicatePattern: patternOps.handleDuplicatePattern, handleClearPatternStrokes: patternOps.handleClearPatternStrokes,
    handleContextDeletePattern: patternOps.handleContextDeletePattern, onCopyPattern: (p) => sequencer.handleCopyPattern(p),
    onPastePattern: (pId) => sequencer.handlePastePattern(effectiveEditTrackId, pId), canPaste: clipboard.canPaste, lang, isVocalContext,
  });

  useInstrumentEditorShortcuts({
    isSettingsOpen, isVocalContext, track, inst, lang, isLeftHanded,
    selectedStepIdx: editorState.selectedStepIdx, activeTool: editorState.activeTool,
    setActiveTool: editorState.setActiveTool, handleClose: ctrl.handleClose,
    puxTrack, coroTrack, isCoroActive, handleSwitchVocalTrack: editorState.handleSwitchVocalTrack,
  });

  const cardProps = useEditorPatternCardProps({
    isVocalContext, track, inst, effectiveEditTrackId, totalPatternsCount: displayedPatterns.length,
    editorState, onStepTouchStart, sequencer, clipboard, isLeftHanded, lang, isMobile,
    armedPatternId, toggleArmPattern, ctrl, patternOps, soloPatternPlayId, soloPatternVariationId,
    onPlaySoloPattern, onStopSoloPattern, displayedPatterns, globalSwing,
  });

  return {
    track, inst, effectiveEditTrackId, effectiveTrack, targetBalancoTrack, displayedPatterns,
    lang, isLeftHanded, isSlave, isVocalContext, isCoroActive, puxTrack, coroTrack,
    tracksMeta, visibleTrackIds, trackDisplayName, getPatternUsage, isPatternRecording,
    togglePatternRecording, armedPatternId, toggleArmPattern, soloPatternPlayId,
    soloPatternVariationId, onPlaySoloPattern, onStopSoloPattern, balancoPresets,
    handleTrackBalancoChange, handlePatternBalancoChange, sequencer, userProfile,
    genererEtUploaderCloudBounce, isBouncingCloud, currentBpm, currentTimeSig,
    clipboard, ctrl, patternOps, cloud, editorState, cardProps, isDetached, isMobile,
  };
}
