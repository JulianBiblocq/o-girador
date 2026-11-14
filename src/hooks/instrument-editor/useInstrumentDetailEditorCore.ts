import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore, isToadaBus, isToadaChild } from '../../stores/useSequencerStore';
import { useLiveMeasure } from '../useLiveMeasure';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useTransportStore } from '../../stores/useTransportStore'; import { useBalancoStore } from '../../stores/useBalancoStore';
import { useSequencer } from '../../contexts/SequencerContext'; import { useAudio } from '../../contexts/AudioContext'; import { useAuth } from '../../contexts/AuthContext';
import { useCloudAudioBounce } from '../useCloudAudioBounce'; import { instrumentsConfig } from '../../data'; import { Track } from '../../types';
import { useInstrumentEditorTracksMeta } from './useInstrumentEditorTracksMeta';
import { useInstrumentEditorRecording } from './useInstrumentEditorRecording';
import { useInstrumentEditorSoloPlayback } from './useInstrumentEditorSoloPlayback';
import { useInstrumentEditorPatterns } from './useInstrumentEditorPatterns';
import { useInstrumentEditorCloudActions } from './useInstrumentEditorCloudActions';
import { useInstrumentDetailEditorController, resolveActiveVocalChild } from './useInstrumentDetailEditorController';
import { useInstrumentDetailEditorState } from './useInstrumentDetailEditorState'; import { useInstrumentEditorShortcuts } from './useInstrumentEditorShortcuts';
import { useEditorPatternCardProps } from './useEditorPatternCardProps';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { reconcileSlavePatterns } from '../../utils/trackLinkingSync';

const EMPTY_TRACKS: Track[] = [];
const EMPTY_VOCAL_PAIR = [undefined, undefined] as const;

export function useInstrumentDetailEditorCore(props: {
  trackId: number; onClose: () => void; isMobile: boolean; isDetached?: boolean;
  onStepTouchStart?: any; setEditingTrackId: (id: number | null) => void;
}) {
  const { trackId, onClose, isMobile, isDetached = false, onStepTouchStart, setEditingTrackId } = props;
  const sequencer = useSequencer(), audio = useAudio(), { userProfile } = useAuth();
  const { genererEtUploaderCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const track = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === trackId), [trackId]));
  const isToada = Boolean(track && (isToadaBus(track) || (track as any).isToadaBus || track.customName === 'Toada' || track.instrumentIdx === 12));
  const currentMeasure = useLiveMeasure(Boolean(track && (isToadaBus(track) || (track as any).isToadaBus)));

  const { lang, isLeftHanded, totalMeasures, handleTrackBalancoChange, handlePatternBalancoChange, editorDeepLink, consumeEditorDeepLink } = useSequencerStore(useShallow((s) => ({
    lang: s.lang, isLeftHanded: s.isLeftHanded, totalMeasures: s.totalMeasures,
    handleTrackBalancoChange: s.handleTrackBalancoChange, handlePatternBalancoChange: s.handlePatternBalancoChange,
    editorDeepLink: s.editorDeepLink, consumeEditorDeepLink: s.consumeEditorDeepLink,
  })));
  const currentBpm = useSequencerStore((s) => s.measureBpms[0] || 100);
  const currentTimeSig = useSequencerStore((s) => s.measureTimeSigs[0] || '4/4');
  const balancoPresets = useBalancoStore((s) => s.presets), globalSwing = useTransportStore((s) => s.globalSwing);
  const isSettingsOpen = useSequencerSettingsStore((s) => s.isSettingsOpen);

  const familyTracks = useSequencerStore(useShallow(useCallback((s) => {
    const cur = s.tracks.find((t) => t.id === trackId);
    if (!cur) return EMPTY_TRACKS;
    if (isToadaBus(cur) || (cur as any).isToadaBus || cur.customName === 'Toada' || cur.instrumentIdx === 12) {
      return s.tracks.filter((t) => isToadaChild(t, s.tracks) || instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    }
    if (cur.isLinkFolder || cur.isBusFolder || cur.linkedToTrackId || cur.isLinkMaster) {
      const refId = cur.linkedToTrackId ? String(cur.linkedToTrackId) : String(cur.id);
      return s.tracks.filter((t) => t.id === cur.id || String(t.id) === refId || String(t.linkedToTrackId) === refId || String(t.linkedToTrackId) === String(cur.id) || String(t.busId) === String(cur.id));
    }
    return EMPTY_TRACKS;
  }, [trackId])));

  const activeVocalChildTrack = useMemo(() => resolveActiveVocalChild(track, isToada, familyTracks, editorDeepLink?.patternId, currentMeasure), [track, isToada, familyTracks, editorDeepLink?.patternId, currentMeasure]);
  const folderChild = (track && (track.isLinkFolder || (track.isBusFolder && !isToada))) ? resolveMasterTrack(trackId, familyTracks) : undefined;
  const effectiveEditTrackId = (isToada && (!track?.patterns || track.patterns.length === 0) && activeVocalChildTrack)
    ? activeVocalChildTrack.id : (folderChild && folderChild.id !== trackId ? folderChild.id : trackId);
  const effectiveTrack = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === effectiveEditTrackId), [effectiveEditTrackId])) ?? track;

  const toadaConfig = instrumentsConfig.find((i) => i.id === 'toada') || instrumentsConfig[12];
  const instSourceTrack = (track?.isLinkFolder && effectiveTrack) ? effectiveTrack : track;
  const inst = instSourceTrack ? (isToada && toadaConfig ? toadaConfig : instrumentsConfig[instSourceTrack.instrumentIdx]) : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };

  const isSlave = isSlaveTrack(effectiveTrack, familyTracks), targetBalancoTrack = effectiveTrack;
  const masterTrack = isSlave ? resolveMasterTrack(effectiveEditTrackId, familyTracks) : null;
  const displayedPatterns = useMemo(() => {
    if (isSlave && effectiveTrack && masterTrack) {
      const outOfSync = !effectiveTrack.patterns?.length || effectiveTrack.patterns.length !== masterTrack.patterns?.length || masterTrack.patterns.some((mp, idx) => effectiveTrack.patterns[idx]?.id !== mp.id);
      return outOfSync ? reconcileSlavePatterns(effectiveTrack, masterTrack).patterns : effectiveTrack.patterns;
    }
    return effectiveTrack?.patterns ?? [];
  }, [isSlave, effectiveTrack, masterTrack]);

  const isVocalContext = Boolean(isToada || String(track?.id) === 'puxador' || String(track?.id) === 'coro' || (track as any)?.type === 'voice' || inst?.type === 'voice' || track?.customName === 'Toada' || track?.customName === 'Puxador' || track?.customName === 'Coro');
  const [puxTrack, coroTrack] = useSequencerStore(useShallow(useCallback((s) => {
    if (!isVocalContext) return EMPTY_VOCAL_PAIR;
    return [
      s.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador' || t.customName === 'Puxador'),
      s.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro' || t.customName === 'Coro'),
    ] as const;
  }, [isVocalContext])));
  const isCoroActive = Boolean((coroTrack && effectiveEditTrackId === coroTrack.id) || String(track?.id) === 'coro' || inst?.id === 'coro' || track?.customName === 'Coro');

  const { tracksMeta, visibleTrackIds, trackDisplayName, getPatternUsage } = useInstrumentEditorTracksMeta(instSourceTrack, effectiveEditTrackId, inst);
  const { isPatternRecording, togglePatternRecording, armedPatternId, toggleArmPattern } = useInstrumentEditorRecording({ trackId: effectiveEditTrackId });
  const { onPlaySoloPattern, onStopSoloPattern, soloPatternPlayId, soloPatternVariationId } = useInstrumentEditorSoloPlayback();
  const ctrl = useInstrumentDetailEditorController(onClose, isMobile);
  const patternOps = useInstrumentEditorPatterns({ effectiveEditTrackId, totalMeasures, lang, sequencer, setSelectedPatternId: (id) => editorState.setSelectedPatternId(id) });
  const cloud = useInstrumentEditorCloudActions({ inst, displayedPatterns, currentBpm, currentTimeSig, lang, sequencer, genererEtUploaderCloudBounce, onLoadLibraryPattern: (targetId, libPtn) => sequencer.handleLoadLibraryPattern(effectiveEditTrackId, targetId, libPtn) });
  const clipboard = useSequencerStore(useShallow((s) => ({ canPaste: Boolean(s.copiedPattern && s.copiedPattern.steps > 0), copyAll: s.copyAllTrackPatterns, pasteAll: s.pasteAllTrackPatterns, clipboard: s.instrumentPatternsClipboard, isPasteable: Boolean(s.instrumentPatternsClipboard?.patterns?.length) })));

  const editorState = useInstrumentDetailEditorState({
    track: effectiveTrack, inst, effectiveEditTrackId, trackId, displayedPatterns, setEditingTrackId,
    handleDuplicatePattern: patternOps.handleDuplicatePattern, handleClearPatternStrokes: patternOps.handleClearPatternStrokes,
    handleContextDeletePattern: patternOps.handleContextDeletePattern, onCopyPattern: (p) => sequencer.handleCopyPattern(p),
    onPastePattern: (pId) => sequencer.handlePastePattern(effectiveEditTrackId, pId), canPaste: clipboard.canPaste, lang, isVocalContext,
    editorDeepLink, consumeEditorDeepLink, isMobile, isInspectorMobileOpen: ctrl.isInspectorMobileOpen,
    setIsInspectorMobileOpen: ctrl.setIsInspectorMobileOpen, puxTrack, coroTrack,
  });

  useInstrumentEditorShortcuts({
    isSettingsOpen, isVocalContext, track: effectiveTrack, inst, lang, isLeftHanded, selectedStepIdx: editorState.selectedStepIdx,
    activeTool: editorState.activeTool, setActiveTool: editorState.setActiveTool, handleClose: ctrl.handleClose,
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
    currentTimeSig, clipboard, ctrl, patternOps, cloud, editorState, cardProps, isDetached, isMobile, audio,
  };
}
