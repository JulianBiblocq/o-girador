import { useState, useMemo, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore, getTrackFamilyIds } from '../../stores/useSequencerStore';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencer } from '../../contexts/SequencerContext';
import { instrumentsConfig } from '../../data';
import { SpeedTrainerTab } from './SpeedTrainerHeader';
import { resolveFamilyLabel, filterPlayableTrainerTracks } from './speedTrainerHelpers';

export const useSpeedTrainerLogic = (changeViewMode?: (mode: any) => void) => {
  const audio = useAudio();
  const sequencer = useSequencer();
  const lang = useSequencerStore((state) => state.lang);
  const isOpen = useSequencerStore((state) => state.isSpeedTrainerOpen);
  const isActive = useSequencerStore((state) => state.isSpeedTrainerActive);
  const storeConfig = useSequencerStore((state) => state.speedTrainerConfig);
  const totalMeasures = useSequencerStore((state) => state.totalMeasures || 1);
  const songMarkers = useSequencerStore(useShallow((state) => state.songMarkers || []));
  const songBpm = useSequencerStore((state) => state.bpm || 83);
  const currentTour = useSequencerStore((state) => state.speedTrainerTourCount || 0);
  const currentBpm = useSequencerStore((state) => state.speedTrainerCurrentBpm || songBpm);
  const closeSpeedTrainerModal = useSequencerStore((state) => state.closeSpeedTrainerModal);
  const activeTrainingSession = useSequencerStore((state) => state.activeTrainingSession);

  const storeTracks = useSequencerStore((state) => state.tracks);
  const focusTrackId = useSequencerStore((state) => state.focusTrackId);
  const tocarJuntoActive = useSequencerStore((state) => state.tocarJuntoActive);
  const tocarJuntoTrackId = useSequencerStore((state) => state.tocarJuntoTrackId);
  const tocarJuntoMuteScope = useSequencerStore((state) => state.tocarJuntoMuteScope);
  const tocarJuntoIsMuted = useSequencerStore((state) => state.tocarJuntoIsMuted);
  const isolateBaseOnly = useSequencerStore((state) => state.isolateBaseOnly);
  const setTocarJuntoTrack = useSequencerStore((state) => state.setTocarJuntoTrack);
  const setTocarJuntoMuteScope = useSequencerStore((state) => state.setTocarJuntoMuteScope);
  const setTocarJuntoIsMuted = useSequencerStore((state) => state.setTocarJuntoIsMuted);
  const setIsolateBaseOnly = useSequencerStore((state) => state.setIsolateBaseOnly);
  const setActiveAoVivoTrackId = useSequencerStore((state) => state.setActiveAoVivoTrackId);
  const mobileViewMode = useSequencerStore((state) => state.mobileViewMode);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768 && mobileViewMode !== 'complet';

  const [activeTab, setActiveTab] = useState<SpeedTrainerTab>('speedTrainer');
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [isMutedOption, setIsMutedOption] = useState<boolean>(false);
  const [selectedMuteScope, setSelectedMuteScope] = useState<'track' | 'family'>('track');
  const [selectedBaseOnly, setSelectedBaseOnly] = useState<boolean>(false);
  const [showAoVivoSticks, setShowAoVivoSticks] = useState<boolean>(true);

  const familyTrackIds = useMemo(() => {
    return selectedTrackId === null ? [] : getTrackFamilyIds(selectedTrackId, storeTracks);
  }, [selectedTrackId, storeTracks]);

  const hasFamilyGroup = familyTrackIds.length > 1;

  const familyLabel = useMemo(() => resolveFamilyLabel(selectedTrackId, storeTracks), [selectedTrackId, storeTracks]);
  const playableTracks = useMemo(() => filterPlayableTrainerTracks(storeTracks), [storeTracks]);
  const sortedMarkers = useMemo(() => [...songMarkers].sort((a, b) => a.measure - b.measure), [songMarkers]);

  useEffect(() => {
    if (!isOpen) return;
    const target = tocarJuntoTrackId ?? focusTrackId ?? playableTracks[0]?.id ?? null;
    if (target !== null) setSelectedTrackId(target);
  }, [isOpen, tocarJuntoTrackId, focusTrackId, playableTracks]);

  const [markerMode, setMarkerMode] = useState<'single' | 'range'>('single');
  const [selectedSectionMarkerId, setSelectedSectionMarkerId] = useState<string>('');
  const [rangeStartMarkerId, setRangeStartMarkerId] = useState<string>('');
  const [rangeEndMarkerId, setRangeEndMarkerId] = useState<string>('');
  const [startMeasure, setStartMeasure] = useState<number>(0);
  const [endMeasure, setEndMeasure] = useState<number>(1);
  const [startBpm, setStartBpm] = useState<number>(63);
  const [targetBpm, setTargetBpm] = useState<number>(songBpm);
  const [bpmStep, setBpmStep] = useState<number>(2);
  const [loopInterval, setLoopInterval] = useState<number>(1);
  const [consolidationLaps, setConsolidationLaps] = useState<number>(2);

  const handleClose = useCallback(() => {
    useSequencerStore.getState().setSpeedTrainerConfig({
      startMeasure, endMeasure, startBpm: Math.min(startBpm, targetBpm), targetBpm, bpmStep, loopInterval,
      consolidationLaps, trainingId: activeTrainingSession?.trainingId || storeConfig?.trainingId,
      stageIndex: activeTrainingSession?.stageIndex || storeConfig?.stageIndex,
      stageTitle: activeTrainingSession?.title || storeConfig?.stageTitle,
    });
    closeSpeedTrainerModal();
  }, [startMeasure, endMeasure, startBpm, targetBpm, bpmStep, loopInterval, consolidationLaps, activeTrainingSession, storeConfig, closeSpeedTrainerModal]);

  const handleLaunch = useCallback(() => {
    handleClose();
    audio.launchSpeedTrainer({
      startMeasure, endMeasure, startBpm: Math.min(startBpm, targetBpm), targetBpm, bpmStep, loopInterval,
      consolidationLaps: activeTrainingSession?.consolidationLaps || consolidationLaps,
      trainingId: activeTrainingSession?.trainingId || storeConfig?.trainingId,
      stageIndex: activeTrainingSession?.stageIndex || storeConfig?.stageIndex,
      stageTitle: activeTrainingSession?.title || storeConfig?.stageTitle,
    });
  }, [handleClose, audio, startMeasure, endMeasure, startBpm, targetBpm, bpmStep, loopInterval, activeTrainingSession, consolidationLaps, storeConfig]);

  const handleStartTrainingDirect = useCallback(() => {
    if (selectedTrackId === null) return;
    useSequencerStore.getState().activateFocusOnTrack(selectedTrackId);
    setTocarJuntoTrack(selectedTrackId, false);
    setTocarJuntoMuteScope(selectedMuteScope);
    setTocarJuntoIsMuted(isMobile ? isMutedOption : false);
    if (showAoVivoSticks) {
      setActiveAoVivoTrackId(selectedTrackId);
    } else {
      setActiveAoVivoTrackId(null);
    }
    if (changeViewMode) changeViewMode('roda');
    handleClose();

    const st = useSequencerStore.getState();
    const sMeasure = st.isLoopRegionActive && st.loopStartMeasure !== null ? st.loopStartMeasure : st.currentMeasure;
    if (audio.isPlayingRef?.current || (audio as any).isPlaying) audio.handleStop();
    audio.handleTogglePlay({ forcePreRoll: true, targetMeasure: sMeasure });
  }, [selectedTrackId, selectedBaseOnly, selectedMuteScope, isMutedOption, showAoVivoSticks, setTocarJuntoTrack, setTocarJuntoMuteScope, setTocarJuntoIsMuted, setActiveAoVivoTrackId, changeViewMode, handleClose, audio]);

  const handleQuitOrCancel = useCallback(() => {
    if (tocarJuntoActive) { setTocarJuntoTrack(null); setActiveAoVivoTrackId(null); }
    handleClose();
  }, [tocarJuntoActive, setTocarJuntoTrack, setActiveAoVivoTrackId, handleClose]);

  return {
    audio, sequencer, lang, isOpen, isActive, storeConfig, totalMeasures, songMarkers, songBpm, currentTour, currentBpm,
    activeTrainingSession, storeTracks, tocarJuntoActive, tocarJuntoTrackId, tocarJuntoMuteScope, tocarJuntoIsMuted,
    isolateBaseOnly, activeTab, setActiveTab, selectedTrackId, setSelectedTrackId, isMutedOption, setIsMutedOption,
    selectedMuteScope, setSelectedMuteScope, selectedBaseOnly, setSelectedBaseOnly, showAoVivoSticks, setShowAoVivoSticks,
    hasFamilyGroup, familyLabel, playableTracks, sortedMarkers, markerMode, setMarkerMode, selectedSectionMarkerId,
    setSelectedSectionMarkerId, rangeStartMarkerId, setRangeStartMarkerId, rangeEndMarkerId, setRangeEndMarkerId,
    startMeasure, setStartMeasure, endMeasure, setEndMeasure, startBpm, setStartBpm, targetBpm, setTargetBpm,
    bpmStep, setBpmStep, loopInterval, setLoopInterval, consolidationLaps, setConsolidationLaps, handleClose,
    handleLaunch, handleStartTrainingDirect, handleQuitOrCancel
  };
};
