/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useAuth } from '../contexts/AuthContext';
import { i18n, instrumentsConfig } from '../data';
import { SpeedTrainerConfig } from '../types/speedTrainer.types';
import { TrainingProgram } from '../types/trainings';
import { X, Minus, Plus, Square, Info, GraduationCap, Save, CheckCircle2, Loader2, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { XiloLightning } from './XiloIcons';
import { CordelTarget } from './ui/CordelTarget';
import { generateTrainingStages } from '../utils/trainingCalculator';
import { saveTrainingProgram, updateTrainingProgram, deleteTrainingProgram, fetchTrainingsByPreset } from '../services/cloudTrainings';

interface HoldButtonProps {
  onAction: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
}

const HoldButton: React.FC<HoldButtonProps> = ({
  onAction,
  disabled = false,
  className = '',
  children,
  title,
}) => {
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || disabledRef.current) return;
    e.preventDefault();
    stop();

    // First increment immediately
    actionRef.current();

    let count = 0;
    timerRef.current = window.setTimeout(() => {
      const runInterval = () => {
        if (disabledRef.current) {
          stop();
          return;
        }
        count++;
        actionRef.current();
        // Progressively accelerate hold speed: 130ms -> 75ms -> 40ms
        const nextSpeed = count > 12 ? 40 : count > 5 ? 75 : 130;
        intervalRef.current = window.setTimeout(runInterval, nextSpeed);
      };
      runInterval();
    }, 320);
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!disabled) actionRef.current();
        }
      }}
      style={{ touchAction: 'none' }}
      className={className}
    >
      {children}
    </button>
  );
};

interface NumberInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  className?: string;
  ariaLabel?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  min,
  max,
  onChange,
  className = '',
  ariaLabel,
}) => {
  const [text, setText] = useState<string>(String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
    setText(String(clamped));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={text}
      onFocus={(e) => {
        isFocusedRef.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        setText(cleaned);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const current = parseInt(text, 10) || value;
          commit(String(current + 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const current = parseInt(text, 10) || value;
          commit(String(current - 1));
        }
      }}
      className={className}
    />
  );
};

interface SpeedTrainerModalProps {
  changeViewMode?: (mode: 'roda' | 'console' | 'timeline' | 'admin' | 'landing') => void;
}

export const SpeedTrainerModal: React.FC<SpeedTrainerModalProps> = ({ changeViewMode }) => {
  const audio = useAudio();
  const sequencer = useSequencer();
  const { userProfile } = useAuth();
  const lang = useSequencerStore((state) => state.lang);
  const setLang = useSequencerStore((state) => state.setLang);
  const t = (key: string) => (i18n[lang] as any)?.[key] || (i18n['pt'] as any)?.[key] || key;

  // Droits étendus Mestre / Admin
  const isMestre = useMemo(() => {
    return ['mestre', 'mestri', 'admin'].includes(userProfile?.role || '') || Boolean(userProfile?.canWriteSequenciador);
  }, [userProfile?.role, userProfile?.canWriteSequenciador]);

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

  // Stores pour Tocar Junto (« Jouer avec »)
  const storeTracks = useSequencerStore((state) => state.tracks);
  const tocarJuntoActive = useSequencerStore((state) => state.tocarJuntoActive);
  const tocarJuntoTrackId = useSequencerStore((state) => state.tocarJuntoTrackId);
  const isolateBaseOnly = useSequencerStore((state) => state.isolateBaseOnly);
  const setTocarJuntoTrack = useSequencerStore((state) => state.setTocarJuntoTrack);
  const setIsolateBaseOnly = useSequencerStore((state) => state.setIsolateBaseOnly);
  const activeAoVivoTrackId = useSequencerStore((state) => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore((state) => state.setActiveAoVivoTrackId);
  const isEcoMode = useSequencerStore((state) => state.isEcoMode);
  const toggleEcoMode = useSequencerStore((state) => state.toggleEcoMode);

  // Type des 3 onglets (Jouer avec, Vitesse & Paliers, Défis & Carnet)
  type SpeedTrainerTab = 'tocarJunto' | 'speedTrainer' | 'mestreChallenges';
  const [activeTab, setActiveTab] = useState<SpeedTrainerTab>('tocarJunto');

  // Formulaire local Tocar Junto
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [isMutedOption, setIsMutedOption] = useState<boolean>(true);
  const [selectedBaseOnly, setSelectedBaseOnly] = useState<boolean>(true);
  const [showAoVivoSticks, setShowAoVivoSticks] = useState<boolean>(true);

  // Filtre rigoureux des pistes percussives (inclut les alfaias liées, exclut les bus réels et voix)
  const playableTracks = useMemo(() => {
    return storeTracks.filter((t) => {
      // Seuls les dossiers bus réels (isBusFolder && !isLinkFolder) sont écartés
      if (t.isBusFolder && !t.isLinkFolder) return false;
      // Les pistes vocales Toada sont écartées
      const inst = instrumentsConfig[t.instrumentIdx];
      if (inst?.type === 'voice' || inst?.id === 'puxador' || inst?.id === 'coro' || (t as any).isToadaBus) {
        return false;
      }
      return true;
    });
  }, [storeTracks]);

  // Markers sorted chronologically
  const sortedMarkers = useMemo(() => {
    return [...songMarkers].sort((a, b) => a.measure - b.measure);
  }, [songMarkers]);

  // Marker selection state
  const [markerMode, setMarkerMode] = useState<'single' | 'range'>('single');
  const [selectedSectionMarkerId, setSelectedSectionMarkerId] = useState<string>('');
  const [rangeStartMarkerId, setRangeStartMarkerId] = useState<string>('');
  const [rangeEndMarkerId, setRangeEndMarkerId] = useState<string>('');

  // Local form state
  const [startMeasure, setStartMeasure] = useState<number>(0);
  const [endMeasure, setEndMeasure] = useState<number>(1);
  const [startBpm, setStartBpm] = useState<number>(63);
  const [targetBpm, setTargetBpm] = useState<number>(songBpm);
  const [bpmStep, setBpmStep] = useState<number>(2);
  const [loopInterval, setLoopInterval] = useState<number>(1);

  // Mestre-specific form state
  const defaultChallengeTitle = useMemo(() => {
    const songName = sequencer.metadata?.toada?.trim() || '';
    return songName ? `Virada - ${songName}` : 'Virada';
  }, [sequencer.metadata?.toada]);

  const [challengeTitle, setChallengeTitle] = useState<string>('');
  const [stagesCount, setStagesCount] = useState<number>(3);
  const [consolidationLaps, setConsolidationLaps] = useState<number>(2);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mestre training management state
  const [existingTrainings, setExistingTrainings] = useState<TrainingProgram[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState<boolean>(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Normalisation presetId & groupId pour Firestore
  const resolvedPresetId = useMemo(() => {
    if (audio.activePresetName && audio.activePresetName.startsWith('cloud:')) {
      return audio.activePresetName.replace('cloud:', '');
    }
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('loadPreset');
    if (fromParam) return fromParam;
    const rawPresetName = sequencer.metadata?.toada?.trim() || audio.activePresetName || '';
    return rawPresetName ? rawPresetName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : '';
  }, [audio.activePresetName, sequencer.metadata?.toada]);

  const effectiveGroupId = useMemo(() => {
    return (userProfile?.groupId || 'samambaia').trim();
  }, [userProfile?.groupId]);

  // Chargement des défis existants sur le morceau
  const loadTrainings = useCallback(async () => {
    if (!resolvedPresetId || !effectiveGroupId) {
      setExistingTrainings([]);
      return;
    }
    setIsLoadingTrainings(true);
    try {
      const list = await fetchTrainingsByPreset(resolvedPresetId, effectiveGroupId);
      setExistingTrainings(list);
    } catch (err) {
      console.error('Error loading trainings:', err);
      setExistingTrainings([]);
    } finally {
      setIsLoadingTrainings(false);
    }
  }, [resolvedPresetId, effectiveGroupId]);

  useEffect(() => {
    if (isOpen && isMestre && activeTab === 'mestreChallenges') {
      loadTrainings();
    }
  }, [isOpen, isMestre, activeTab, loadTrainings]);

  // Réinitialiser la confirmation de suppression en cas de changement d'onglet ou fermeture
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [isOpen, activeTab]);

  // Écouteur de clic externe pour annuler la confirmation de suppression
  useEffect(() => {
    if (!confirmDeleteId) return;
    const handleDocumentPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`[data-training-card="${confirmDeleteId}"]`)) {
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [confirmDeleteId]);

  // Marker selection handlers
  const handleSelectSingleMarker = (markerId: string) => {
    setSelectedSectionMarkerId(markerId);
    if (!markerId) return;
    const idx = sortedMarkers.findIndex((m) => m.id === markerId);
    if (idx === -1) return;
    const marker = sortedMarkers[idx];
    const nextMarker = sortedMarkers[idx + 1];
    const start = Math.min(totalMeasures - 1, Math.max(0, marker.measure));
    const end = nextMarker
      ? Math.min(totalMeasures - 1, Math.max(start, nextMarker.measure - 1))
      : totalMeasures - 1;
    setStartMeasure(start);
    setEndMeasure(end);
  };

  const handleSelectRangeStart = (startId: string) => {
    setRangeStartMarkerId(startId);
    if (!startId) return;
    const markerA = sortedMarkers.find((m) => m.id === startId);
    if (!markerA) return;
    const start = Math.min(totalMeasures - 1, Math.max(0, markerA.measure));
    setStartMeasure(start);
    // Interval safety: force endMeasure >= startMeasure
    if (start > endMeasure) {
      setEndMeasure(start);
    }
  };

  const handleSelectRangeEnd = (endId: string) => {
    setRangeEndMarkerId(endId);
    if (!endId) return;
    const idx = sortedMarkers.findIndex((m) => m.id === endId);
    if (idx === -1) return;
    const markerB = sortedMarkers[idx];
    const nextMarker = sortedMarkers[idx + 1];
    const end = nextMarker
      ? Math.min(totalMeasures - 1, Math.max(markerB.measure, nextMarker.measure - 1))
      : totalMeasures - 1;
    setEndMeasure(end);
    // Interval safety: force endMeasure >= startMeasure
    if (end < startMeasure) {
      setStartMeasure(markerB.measure);
      setRangeStartMarkerId(endId);
    }
  };

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      if (activeTrainingSession) {
        const sM = storeConfig ? storeConfig.startMeasure : 0;
        const eM = storeConfig ? storeConfig.endMeasure : Math.min(1, totalMeasures - 1);
        setStartMeasure(Math.min(sM, totalMeasures - 1));
        setEndMeasure(Math.min(Math.max(sM, eM), totalMeasures - 1));
        setStartBpm(activeTrainingSession.startBpm);
        setTargetBpm(activeTrainingSession.targetBpm);
        setBpmStep(storeConfig?.bpmStep || 2);
        setLoopInterval(storeConfig?.loopInterval || 1);
        setConsolidationLaps(activeTrainingSession.consolidationLaps || 2);
      } else {
        const initialTarget = songBpm;
        const initialStart = Math.max(40, initialTarget - 20);

        const sM = storeConfig ? storeConfig.startMeasure : 0;
        const eM = storeConfig ? storeConfig.endMeasure : Math.min(1, totalMeasures - 1);

        setStartMeasure(Math.min(sM, totalMeasures - 1));
        setEndMeasure(Math.min(Math.max(sM, eM), totalMeasures - 1));
        setStartBpm(storeConfig ? storeConfig.startBpm : initialStart);
        setTargetBpm(storeConfig ? storeConfig.targetBpm : initialTarget);
        setBpmStep(storeConfig?.bpmStep || 2);
        setLoopInterval(storeConfig?.loopInterval || 1);
      }
      setSelectedSectionMarkerId('');
      setRangeStartMarkerId('');
      setRangeEndMarkerId('');
      setChallengeTitle(defaultChallengeTitle);
      setEditingTrainingId(null);
      setSaveSuccess(false);
      setSaveMessage(null);
      setSaveError(null);
    }
  }, [isOpen, storeConfig, songBpm, totalMeasures, defaultChallengeTitle, activeTrainingSession]);

  const handleClose = useCallback(() => {
    useSequencerStore.getState().setSpeedTrainerConfig({
      startMeasure,
      endMeasure,
      startBpm: Math.min(startBpm, targetBpm),
      targetBpm,
      bpmStep,
      loopInterval,
      consolidationLaps: activeTrainingSession ? activeTrainingSession.consolidationLaps : consolidationLaps,
      trainingId: activeTrainingSession?.trainingId || storeConfig?.trainingId,
      stageIndex: activeTrainingSession?.stageIndex || storeConfig?.stageIndex,
      stageTitle: activeTrainingSession?.title || storeConfig?.stageTitle,
    });
    closeSpeedTrainerModal();
  }, [startMeasure, endMeasure, startBpm, targetBpm, bpmStep, loopInterval, consolidationLaps, activeTrainingSession, storeConfig, closeSpeedTrainerModal]);

  // Synchronisation de l'onglet et de la sélection Tocar Junto à l'ouverture
  useEffect(() => {
    if (isOpen) {
      if (tocarJuntoActive && tocarJuntoTrackId !== null) {
        setActiveTab('tocarJunto');
        setSelectedTrackId(tocarJuntoTrackId);
        setSelectedBaseOnly(isolateBaseOnly);
      } else if (isActive) {
        setActiveTab('speedTrainer');
      } else {
        setActiveTab('tocarJunto');
        if (selectedTrackId === null && playableTracks.length > 0) {
          setSelectedTrackId(playableTracks[0].id);
        }
      }
    }
  }, [isOpen, tocarJuntoActive, tocarJuntoTrackId, isolateBaseOnly, isActive, playableTracks]);

  const handleValidateTocarJunto = () => {
    if (selectedTrackId === null) return;
    const targetTrack = storeTracks.find((t) => t.id === selectedTrackId);
    if (!targetTrack) return;

    // 1. Armer le mode Tocar Junto
    setTocarJuntoTrack(selectedTrackId, selectedBaseOnly);

    // 2. Gérer les baguettes Ao Vivo
    if (showAoVivoSticks) {
      setActiveAoVivoTrackId(selectedTrackId);
      if (isEcoMode) {
        toggleEcoMode();
      }
    } else {
      setActiveAoVivoTrackId(null);
    }

    // 3. Basculer vers la vue Roda
    if (changeViewMode) {
      changeViewMode('roda');
    }

    // 4. Log de contrôle strict
    const trackDisplayName =
      (targetTrack as any).name ||
      targetTrack.customName ||
      instrumentsConfig[targetTrack.instrumentIdx]?.name ||
      'Piste';
    console.log('🎯 [TOCAR JUNTO SUCCÈS] Mode armé pour la piste :', trackDisplayName, '(ID:', targetTrack.id, ')');

    // 5. Fermer la modale
    handleClose();
  };

  const handleDeactivateTocarJunto = () => {
    setTocarJuntoTrack(null);
    setActiveAoVivoTrackId(null);
    handleClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Calcul dynamique des paliers Mestre (enchaînement strict sans rupture)
  const calculatedStages = useMemo(() => {
    return generateTrainingStages(
      Math.min(startBpm, targetBpm),
      targetBpm,
      stagesCount,
      bpmStep,
      loopInterval,
      consolidationLaps
    );
  }, [startBpm, targetBpm, stagesCount, bpmStep, loopInterval, consolidationLaps]);

  if (!isOpen) return null;

  const handleLaunch = () => {
    const config: SpeedTrainerConfig = {
      startMeasure,
      endMeasure,
      startBpm: Math.min(startBpm, targetBpm),
      targetBpm,
      bpmStep,
      loopInterval,
      consolidationLaps: activeTrainingSession ? activeTrainingSession.consolidationLaps : consolidationLaps,
      trainingId: activeTrainingSession?.trainingId || storeConfig?.trainingId,
      stageIndex: activeTrainingSession?.stageIndex || storeConfig?.stageIndex,
      stageTitle: activeTrainingSession?.title || storeConfig?.stageTitle,
    };
    handleClose();
    audio.launchSpeedTrainer(config);
  };

  const handleStopAndRestore = () => {
    handleClose();
    audio.stopSpeedTrainerAudio();
  };

  const handleStartEditTraining = (training: TrainingProgram) => {
    if (!training.id) return;
    setEditingTrainingId(training.id);
    setChallengeTitle(training.title || defaultChallengeTitle);
    setStartMeasure(training.startMeasure);
    setEndMeasure(training.endMeasure);
    setStagesCount(training.stagesCount || 3);
    setConsolidationLaps(training.consolidationLaps || 2);
    if (training.stages && training.stages.length > 0) {
      setStartBpm(training.stages[0].startBpm);
      setTargetBpm(training.stages[training.stages.length - 1].targetBpm);
      setBpmStep(training.stages[0].bpmStep || 2);
      setLoopInterval(training.stages[0].loopInterval || 1);
    }
    setSelectedSectionMarkerId('');
    setRangeStartMarkerId('');
    setRangeEndMarkerId('');
    setSaveSuccess(false);
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingTrainingId(null);
    setChallengeTitle(defaultChallengeTitle);
    setSaveSuccess(false);
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleDeleteTraining = async (trainingId: string) => {
    setIsDeletingId(trainingId);
    setSaveError(null);
    try {
      await deleteTrainingProgram(trainingId);
      // Reset après suppression si c'était le défi en cours d'édition
      if (editingTrainingId === trainingId) {
        handleCancelEdit();
      }
      setSaveMessage(t('speedTrainerChallengeDeleted'));
      setSaveSuccess(true);
      await loadTrainings();
    } catch (err: any) {
      console.error('Failed to delete training program:', err);
      setSaveError(err?.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleSaveTraining = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setSaveMessage(null);

    try {
      const rawPresetName = sequencer.metadata?.toada?.trim() || audio.activePresetName || 'Morceau';
      const effectiveMestreId = userProfile?.uid || '';

      // Point 1: Régénération impérative du tableau stages via generateTrainingStages(...)
      const freshStages = generateTrainingStages(
        Math.min(startBpm, targetBpm),
        targetBpm,
        stagesCount,
        bpmStep,
        loopInterval,
        consolidationLaps
      );

      if (editingTrainingId) {
        await updateTrainingProgram(editingTrainingId, {
          title: challengeTitle.trim() || defaultChallengeTitle,
          startMeasure,
          endMeasure,
          stagesCount,
          consolidationLaps,
          stages: freshStages,
        });
        setSaveMessage(t('speedTrainerChallengeUpdated'));
        setSaveSuccess(true);
        setEditingTrainingId(null);
        setChallengeTitle(defaultChallengeTitle);
      } else {
        const programData: Omit<TrainingProgram, 'id'> = {
          presetId: resolvedPresetId,
          presetName: rawPresetName,
          groupId: effectiveGroupId,
          mestreId: effectiveMestreId,
          title: challengeTitle.trim() || defaultChallengeTitle,
          startMeasure,
          endMeasure,
          stagesCount,
          consolidationLaps,
          stages: freshStages,
          createdAt: Date.now(),
        };

        await saveTrainingProgram(programData);
        setSaveMessage(t('speedTrainerChallengeSaved'));
        setSaveSuccess(true);
        setChallengeTitle(defaultChallengeTitle);
      }

      await loadTrainings();
    } catch (err: any) {
      console.error('Failed to save training program:', err);
      setSaveError(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Section de sélection des mesures (partagée entre mode libre et Mestre)
  const renderMeasureSelection = () => (
    <div className="flex flex-col gap-2">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
        📍 {t('speedTrainerZone')}
      </label>

      {/* Repères / Sections si disponibles */}
      {sortedMarkers.length > 0 && (
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2.5 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#666] font-bold uppercase flex items-center gap-1">
              🏷️ {t('speedTrainerMarkersTitle')}
            </span>
            {sortedMarkers.length > 1 && (
              <div className="flex border border-[#1a1a1a] rounded-xs bg-[#ebe2cb] p-0.5 text-[10px] font-cactus">
                <button
                  type="button"
                  onClick={() => setMarkerMode('single')}
                  className={`px-2 py-0.5 rounded-xs font-bold transition-all cursor-pointer ${
                    markerMode === 'single'
                      ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
                      : 'text-[#1a1a1a] hover:bg-black/5'
                  }`}
                >
                  {t('speedTrainerSingleMarker')}
                </button>
                <button
                  type="button"
                  onClick={() => setMarkerMode('range')}
                  className={`px-2 py-0.5 rounded-xs font-bold transition-all cursor-pointer ${
                    markerMode === 'range'
                      ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
                      : 'text-[#1a1a1a] hover:bg-black/5'
                  }`}
                >
                  {t('speedTrainerRangeMarker')}
                </button>
              </div>
            )}
          </div>

          {markerMode === 'single' ? (
            <div className="flex flex-col gap-1">
              <select
                value={selectedSectionMarkerId}
                onChange={(e) => handleSelectSingleMarker(e.target.value)}
                className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
              >
                <option value="">{t('speedTrainerSelectSection')}</option>
                {sortedMarkers.map((m, idx) => {
                  const nextM = sortedMarkers[idx + 1];
                  const endM = nextM ? Math.max(m.measure, nextM.measure - 1) : totalMeasures - 1;
                  const mStart = m.measure + 1;
                  const mEnd = endM + 1;
                  const rangeLabel = mStart === mEnd ? `m. ${mStart}` : `m. ${mStart} - ${mEnd}`;
                  const cleanName = m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${mStart}`;
                  return (
                    <option key={m.id} value={m.id}>
                      📍 {cleanName} ({rangeLabel})
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[#666] font-bold uppercase">
                  {t('speedTrainerFromMarker')}
                </span>
                <select
                  value={rangeStartMarkerId}
                  onChange={(e) => handleSelectRangeStart(e.target.value)}
                  className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                >
                  <option value="">{t('speedTrainerMarkerStartPlaceholder')}</option>
                  {sortedMarkers.map((m) => {
                    const mStart = m.measure + 1;
                    const cleanName = m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${mStart}`;
                    return (
                      <option key={m.id} value={m.id}>
                        {cleanName} (m. {mStart})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[#666] font-bold uppercase">
                  {t('speedTrainerToMarker')}
                </span>
                <select
                  value={rangeEndMarkerId}
                  onChange={(e) => handleSelectRangeEnd(e.target.value)}
                  className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                >
                  <option value="">{t('speedTrainerMarkerEndPlaceholder')}</option>
                  {sortedMarkers.map((m, idx) => {
                    const nextM = sortedMarkers[idx + 1];
                    const endM = nextM ? Math.max(m.measure, nextM.measure - 1) : totalMeasures - 1;
                    const mStart = m.measure + 1;
                    const mEnd = endM + 1;
                    const rangeLabel = mStart === mEnd ? `m. ${mStart}` : `m. ${mStart} - ${mEnd}`;
                    const cleanName = m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${mStart}`;
                    return (
                      <option key={m.id} value={m.id}>
                        {cleanName} ({rangeLabel})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Start Measure */}
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1">
          <span className="text-[10px] text-[#666] font-bold uppercase">
            {t('speedTrainerFrom')}
          </span>
          <div className="flex items-center justify-between">
            <HoldButton
              onAction={() => {
                setStartMeasure(prev => Math.max(0, prev - 1));
                setSelectedSectionMarkerId('');
              }}
              disabled={startMeasure <= 0}
              className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </HoldButton>
            <NumberInput
              value={startMeasure + 1}
              min={1}
              max={totalMeasures}
              ariaLabel={t('speedTrainerFrom')}
              onChange={(val) => {
                const newStart = val - 1;
                setStartMeasure(newStart);
                setSelectedSectionMarkerId('');
                if (newStart > endMeasure) {
                  setEndMeasure(newStart);
                }
              }}
              className="w-14 text-center font-cactus font-bold text-xl tabular-nums bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
            />
            <HoldButton
              onAction={() => {
                setStartMeasure(prev => {
                  const next = Math.min(totalMeasures - 1, prev + 1);
                  if (next > endMeasure) {
                    setEndMeasure(next);
                  }
                  return next;
                });
                setSelectedSectionMarkerId('');
              }}
              disabled={startMeasure >= totalMeasures - 1}
              className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </HoldButton>
          </div>
        </div>

        {/* End Measure */}
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1">
          <span className="text-[10px] text-[#666] font-bold uppercase">
            {t('speedTrainerTo')}
          </span>
          <div className="flex items-center justify-between">
            <HoldButton
              onAction={() => {
                setEndMeasure(prev => {
                  const next = Math.max(0, prev - 1);
                  if (next < startMeasure) {
                    setStartMeasure(next);
                  }
                  return next;
                });
                setSelectedSectionMarkerId('');
              }}
              disabled={endMeasure <= 0}
              className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </HoldButton>
            <NumberInput
              value={endMeasure + 1}
              min={1}
              max={totalMeasures}
              ariaLabel={t('speedTrainerTo')}
              onChange={(val) => {
                const newEnd = val - 1;
                setEndMeasure(newEnd);
                setSelectedSectionMarkerId('');
                if (newEnd < startMeasure) {
                  setStartMeasure(newEnd);
                }
              }}
              className="w-14 text-center font-cactus font-bold text-xl tabular-nums bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
            />
            <HoldButton
              onAction={() => {
                setEndMeasure(prev => Math.min(totalMeasures - 1, prev + 1));
                setSelectedSectionMarkerId('');
              }}
              disabled={endMeasure >= totalMeasures - 1}
              className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </HoldButton>
          </div>
        </div>
      </div>
    </div>
  );

  // Section des tempos (partagée)
  const renderTempoSelection = () => (
    <div className="grid grid-cols-2 gap-2">
      {/* Start BPM */}
      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          🐢 {t('speedTrainerStartBpm')}
        </label>
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
          <HoldButton
            onAction={() => setStartBpm(prev => Math.max(40, prev - 1))}
            disabled={startBpm <= 40}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </HoldButton>
          <div className="text-center flex flex-col items-center">
            <NumberInput
              value={startBpm}
              min={40}
              max={240}
              ariaLabel={t('speedTrainerStartBpm')}
              onChange={(val) => {
                setStartBpm(val);
                if (val > targetBpm) {
                  setTargetBpm(val);
                }
              }}
              className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
            />
            <span className="text-[9px] font-bold text-[#888]">BPM</span>
          </div>
          <HoldButton
            onAction={() => {
              setStartBpm(prev => {
                const next = Math.min(240, prev + 1);
                if (next > targetBpm) {
                  setTargetBpm(next);
                }
                return next;
              });
            }}
            disabled={startBpm >= 240}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </HoldButton>
        </div>
      </div>

      {/* Target BPM */}
      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          🎯 {t('speedTrainerTargetBpm')}
        </label>
        <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
          <HoldButton
            onAction={() => {
              setTargetBpm(prev => {
                const next = Math.max(40, prev - 1);
                if (next < startBpm) {
                  setStartBpm(next);
                }
                return next;
              });
            }}
            disabled={targetBpm <= 40}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </HoldButton>
          <div className="text-center flex flex-col items-center">
            <NumberInput
              value={targetBpm}
              min={40}
              max={240}
              ariaLabel={t('speedTrainerTargetBpm')}
              onChange={(val) => {
                setTargetBpm(val);
                if (val < startBpm) {
                  setStartBpm(val);
                }
              }}
              className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
            />
            <span className="text-[9px] font-bold text-[#888]">BPM</span>
          </div>
          <HoldButton
            onAction={() => setTargetBpm(prev => Math.min(240, prev + 1))}
            disabled={targetBpm >= 240}
            className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </HoldButton>
        </div>
      </div>
    </div>
  );

  // Section Accélération & Fréquence (partagée)
  const renderStepAndInterval = () => (
    <div className="grid grid-cols-2 gap-2">
      {/* Accélération (+1, +2, +4) */}
      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          📈 {t('speedTrainerStep')}
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 4].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setBpmStep(step)}
              className={`py-1.5 text-xs font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
                bpmStep === step
                  ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                  : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
              }`}
            >
              +{step}
            </button>
          ))}
        </div>
      </div>

      {/* Fréquence (Chaque tour / Tous les 2 tours) */}
      <div className="flex flex-col gap-1.5">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
          🔄 {t('speedTrainerInterval')}
        </label>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setLoopInterval(1)}
            className={`py-1.5 px-1 text-[11px] font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
              loopInterval === 1
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            {t('speedTrainerEveryLoop')}
          </button>
          <button
            type="button"
            onClick={() => setLoopInterval(2)}
            className={`py-1.5 px-1 text-[11px] font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
              loopInterval === 2
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
            }`}
          >
            {t('speedTrainerEvery2Loops')}
          </button>
        </div>
      </div>
    </div>
  );

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 select-none">
      <div 
        className="w-full max-w-[500px] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] flex flex-col overflow-hidden text-[#1a1a1a] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-3 sm:p-4 bg-[#ebe2cb] border-b-2 border-[#1a1a1a] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-none bg-amber-500/20 border border-amber-600 flex items-center justify-center text-amber-700 shadow-[1px_1px_0px_#1a1a1a] shrink-0">
              <XiloLightning size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="font-cactus font-bold text-base sm:text-xl uppercase tracking-wide leading-none truncate">
                {t('speedTrainerTitle')}
              </h2>
              <span className="text-[10px] text-[#555] font-sans font-bold block truncate">
                {t('speedTrainerSubtitle')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sélecteur de langue rapide Cordel [ PT | FR ] */}
            <div 
              className="flex items-stretch h-7 border-2 border-[#1a1a1a] dark:border-black rounded-none shadow-[1px_1px_0px_#1a1a1a] overflow-hidden bg-[#f4ecd8]"
              role="group"
              aria-label={lang === 'fr' ? 'Sélecteur de langue' : 'Seletor de idioma'}
            >
              <button
                type="button"
                onClick={() => setLang('pt')}
                className={`px-2 flex items-center justify-center text-xs font-bold font-mono tracking-wider transition-colors cursor-pointer select-none ${
                  lang === 'pt'
                    ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                    : 'bg-[#f4ecd8] text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-[#ebe2cb]'
                }`}
                title="Português"
              >
                PT
              </button>
              <div className="w-[1.5px] bg-[#1a1a1a] dark:bg-black" />
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2 flex items-center justify-center text-xs font-bold font-mono tracking-wider transition-colors cursor-pointer select-none ${
                  lang === 'fr'
                    ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                    : 'bg-[#f4ecd8] text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-[#ebe2cb]'
                }`}
                title="Français"
              >
                FR
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center border-2 border-[#1a1a1a] rounded-none bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] font-bold text-base transition-colors shadow-[2px_2px_0px_#1a1a1a] cursor-pointer"
              title={lang === 'fr' ? 'Fermer (Échap)' : 'Fechar (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs Selector : 2 onglets pour tous (élèves & Mestres), 3 onglets pour les Mestres */}
        <div className="flex border-b-2 border-[#1a1a1a] bg-[#ebe2cb] px-3 pt-2 gap-2 overflow-x-auto">
          {/* Onglet 1 : Jouer avec (Tocar Junto) */}
          <button
            type="button"
            onClick={() => setActiveTab('tocarJunto')}
            className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase tracking-wide border-t-2 border-x-2 border-[#1a1a1a] rounded-t-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tocarJunto'
                ? 'bg-[#f4ecd8] text-[#1a1a1a] -mb-[2px] pb-2 shadow-[0px_-2px_0px_#1a1a1a]'
                : 'bg-[#ebe2cb] text-[#666] hover:text-[#1a1a1a] hover:bg-[#dfd5bc]'
            }`}
          >
            <CordelTarget size={14} className={activeTab === 'tocarJunto' ? 'text-[#c25e38]' : 'text-current'} />
            {t('speedTrainerTabTocarJunto')}
          </button>

          {/* Onglet 2 : Vitesse & Paliers (Speed Trainer) */}
          <button
            type="button"
            onClick={() => setActiveTab('speedTrainer')}
            className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase tracking-wide border-t-2 border-x-2 border-[#1a1a1a] rounded-t-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'speedTrainer'
                ? 'bg-[#f4ecd8] text-[#1a1a1a] -mb-[2px] pb-2 shadow-[0px_-2px_0px_#1a1a1a]'
                : 'bg-[#ebe2cb] text-[#666] hover:text-[#1a1a1a] hover:bg-[#dfd5bc]'
            }`}
          >
            <XiloLightning size={14} />
            {t('speedTrainerTabSpeed')}
          </button>

          {/* Onglet 3 : Défis & Carnet (Mestre uniquement) */}
          {isMestre && (
            <button
              type="button"
              onClick={() => setActiveTab('mestreChallenges')}
              className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase tracking-wide border-t-2 border-x-2 border-[#1a1a1a] rounded-t-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'mestreChallenges'
                  ? 'bg-[#f4ecd8] text-[#1a1a1a] -mb-[2px] pb-2 shadow-[0px_-2px_0px_#1a1a1a]'
                  : 'bg-[#ebe2cb] text-[#666] hover:text-[#1a1a1a] hover:bg-[#dfd5bc]'
              }`}
            >
              <GraduationCap size={14} />
              {t('speedTrainerTabMestreChallenges')}
            </button>
          )}
        </div>

        {/* Live Active Banner if Speed Trainer is active */}
        {isActive && activeTab === 'speedTrainer' && (
          <div className="bg-amber-500/15 border-b-2 border-amber-600/50 p-2.5 px-4 flex items-center justify-between text-xs font-bold text-amber-900">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
              </span>
              <span>
                {t('speedTrainerActiveBanner')} : {t('speedTrainerTour')} {currentTour + 1}
              </span>
            </div>
            <span className="font-cactus text-sm">
              {currentBpm} / {targetBpm} BPM
            </span>
          </div>
        )}

        {/* Live Banner if Tocar Junto is running */}
        {tocarJuntoActive && activeTab === 'tocarJunto' && (() => {
          const activeTrack = storeTracks.find((t) => t.id === tocarJuntoTrackId);
          const inst = activeTrack ? instrumentsConfig[activeTrack.instrumentIdx] : null;
          const name = activeTrack?.customName || inst?.name || 'Pupitre';
          return (
            <div className="bg-[#c25e38]/15 border-b-2 border-[#c25e38]/50 p-2.5 px-4 flex items-center justify-between text-xs font-bold text-[#8b2a1a]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c25e38] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c25e38]"></span>
                </span>
                <span>
                  {lang === 'fr' ? `Mode Jouer avec actif sur : ${name}` : `Modo Tocar Junto ativo em: ${name}`}
                </span>
              </div>
              <span className="font-cactus text-sm">
                {isolateBaseOnly ? (lang === 'fr' ? '🔒 Base pure' : '🔒 Base pura') : (lang === 'fr' ? '🎲 Avec variations' : '🎲 Com variações')}
              </span>
            </div>
          );
        })()}

        {/* Body Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[72vh]">
          {activeTab === 'tocarJunto' ? (
            /* --- ONGLET 1 : JOUER AVEC (TOCAR JUNTO) --- */
            <div className="flex flex-col gap-4">
              {/* En-tête explicatif */}
              <div className="p-3 bg-amber-500/10 border-2 border-[#1a1a1a] rounded-none flex items-center gap-3">
                <CordelTarget size={26} className="text-[#c25e38] shrink-0" />
                <div className="flex flex-col">
                  <span className="font-cactus font-bold text-sm text-[#1a1a1a]">
                    {lang === 'fr' ? 'Mode Entraînement : Jouer avec' : 'Modo Treino: Tocar Junto'}
                  </span>
                  <span className="text-xs text-[#1a1a1a]/80 leading-snug">
                    {t('tocarJuntoInstruction')}
                  </span>
                </div>
              </div>

              {/* Sélecteur de pupitre */}
              <div className="flex flex-col gap-2">
                <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a]">
                  {lang === 'fr' ? '1. Choisissez votre pupitre :' : '1. Escolha seu naipe :'}
                </label>
                {playableTracks.length === 0 ? (
                  <div className="p-3 bg-black/5 text-xs italic text-center text-black/60 border border-black/20">
                    {t('tocarJuntoNoTracks')}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {playableTracks.map((track) => {
                      const inst = instrumentsConfig[track.instrumentIdx];
                      const name = track.customName || inst?.name || `Track ${track.id}`;
                      const isSelected = selectedTrackId === track.id;
                      const isCurrentActive = tocarJuntoActive && tocarJuntoTrackId === track.id;

                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => setSelectedTrackId(track.id)}
                          className={`p-2.5 flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer rounded-none text-center relative ${
                            isSelected
                              ? 'border-[#1a1a1a] bg-[#c25e38] text-white shadow-[2px_2px_0px_#1a1a1a]'
                              : 'border-[#1a1a1a]/40 bg-white/70 hover:bg-white text-[#1a1a1a] hover:border-[#1a1a1a]'
                          }`}
                        >
                          {isCurrentActive && (
                            <span className="absolute top-1 right-1 text-[9px] px-1 py-0.2 bg-white/90 text-[#c25e38] font-bold font-mono uppercase rounded-none">
                              {lang === 'fr' ? 'Actif' : 'Ativo'}
                            </span>
                          )}
                          {inst?.iconImg && (
                            <img src={inst.iconImg} alt={name} className="w-7 h-7 object-contain" />
                          )}
                          <span className="font-cactus font-bold text-xs truncate max-w-full">
                            {name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Options de comportement */}
              <div className="flex flex-col gap-2">
                <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a]">
                  {lang === 'fr' ? '2. Options de jeu :' : '2. Opções de treino :'}
                </label>
                <div className="p-3 bg-white/60 border-2 border-[#1a1a1a] flex flex-col gap-3 rounded-none shadow-[2px_2px_0px_#1a1a1a]">
                  {/* Option Sourdine audio */}
                  <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                    <div className="flex flex-col pr-2">
                      <span className="font-cactus font-bold text-xs text-[#1a1a1a]">
                        {t('tocarJuntoMuteInstrument')}
                      </span>
                      <span className="text-[10px] text-black/60 leading-tight">
                        {lang === 'fr'
                          ? 'Coupe l’audio de ce pupitre dans le batuque pour vous laisser jouer physiquement en direct.'
                          : 'Silencia o áudio deste naipe no batuque para você tocar fisicamente por cima.'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isMutedOption}
                      onChange={(e) => setIsMutedOption(e.target.checked)}
                      className="w-4 h-4 accent-[#c25e38] cursor-pointer shrink-0"
                    />
                  </label>

                  <div className="border-t border-black/15" />

                  {/* Option Variations */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-cactus font-bold text-xs text-[#1a1a1a]">
                      {t('tocarJuntoVariationMode')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBaseOnly(true)}
                        className={`p-2 border-2 text-left flex flex-col gap-0.5 rounded-none cursor-pointer transition-all ${
                          selectedBaseOnly
                            ? 'border-[#1a1a1a] bg-[var(--cordel-wood)] text-white shadow-[2px_2px_0px_#1a1a1a]'
                            : 'border-[#1a1a1a]/30 bg-white/70 hover:bg-white text-[#1a1a1a]'
                        }`}
                      >
                        <span className="font-cactus font-bold text-xs">
                          🔒 {t('tocarJuntoBasePure')}
                        </span>
                        <span className="text-[10px] opacity-80 leading-tight">
                          {t('tocarJuntoBasePureDesc')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBaseOnly(false)}
                        className={`p-2 border-2 text-left flex flex-col gap-0.5 rounded-none cursor-pointer transition-all ${
                          !selectedBaseOnly
                            ? 'border-[#1a1a1a] bg-[var(--cordel-wood)] text-white shadow-[2px_2px_0px_#1a1a1a]'
                            : 'border-[#1a1a1a]/30 bg-white/70 hover:bg-white text-[#1a1a1a]'
                        }`}
                      >
                        <span className="font-cactus font-bold text-xs">
                          🎲 {t('tocarJuntoFreeGame')}
                        </span>
                        <span className="text-[10px] opacity-80 leading-tight">
                          {t('tocarJuntoFreeGameDesc')}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-black/15" />

                  {/* Option Baguettes Ao Vivo */}
                  <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                    <div className="flex flex-col pr-2">
                      <span className="font-cactus font-bold text-xs text-[#1a1a1a]">
                        {t('tocarJuntoShowAoVivo')}
                      </span>
                      <span className="text-[10px] text-black/60 leading-tight">
                        {lang === 'fr'
                          ? 'Affiche les baguettes animées en vue Roda sur le tambour de votre pupitre.'
                          : 'Exibe as baquetas animadas na Roda sobre o tambor do seu naipe.'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showAoVivoSticks}
                      onChange={(e) => setShowAoVivoSticks(e.target.checked)}
                      className="w-4 h-4 accent-[#c25e38] cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              </div>

              {/* Actions de validation */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  disabled={selectedTrackId === null}
                  onClick={handleValidateTocarJunto}
                  className="flex-1 py-2.5 px-4 bg-[#c25e38] hover:bg-[#a84c2a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-cactus font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] cursor-pointer rounded-none transition-all active:translate-x-0.5 active:translate-y-0.5"
                >
                  <CordelTarget size={16} className="text-white" />
                  <span>{t('tocarJuntoValidate')}</span>
                </button>

                {tocarJuntoActive && (
                  <button
                    type="button"
                    onClick={handleDeactivateTocarJunto}
                    className="py-2.5 px-4 bg-white hover:bg-red-50 text-red-700 font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer rounded-none transition-all"
                  >
                    <X size={14} />
                    <span>{t('tocarJuntoDeactivate')}</span>
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'speedTrainer' ? (
            /* --- ONGLET 1 : ENTRAÎNEMENT LIBRE --- */
            <>
              {/* Challenge Mestre Banner if launched from Organizad'Or */}
              {activeTrainingSession && (
                <div className="p-3 bg-amber-500/20 border-2 border-amber-600/60 rounded-xs flex flex-col gap-1 shadow-[2px_2px_0px_#1a1a1a]">
                  <div className="flex items-center justify-between">
                    <span className="font-cactus font-bold text-sm text-[#1a1a1a] flex items-center gap-1.5">
                      🎯 {activeTrainingSession.title || 'Défi Mestre'} — Palier {activeTrainingSession.stageIndex}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-600 text-[#f4ecd8] rounded-xs uppercase">
                      Défi
                    </span>
                  </div>
                  <span className="text-xs text-[#555] font-sans">
                    Objectif : {activeTrainingSession.startBpm} ➔ {activeTrainingSession.targetBpm} BPM ({activeTrainingSession.consolidationLaps} tour{activeTrainingSession.consolidationLaps > 1 ? 's' : ''} de maintien)
                  </span>
                </div>
              )}

              {/* Pedagogical Help Box */}
              <div className="p-2.5 bg-[#ebe2cb]/70 border border-[#1a1a1a]/40 rounded-xs flex items-start gap-2 text-[11px] text-[#333] leading-relaxed">
                <Info className="w-4 h-4 text-[#8b2a1a] shrink-0 mt-0.5" />
                <p>{t('speedTrainerHelp')}</p>
              </div>

              {/* 1. Zone de travail (Mesures) */}
              {renderMeasureSelection()}

              {/* 2. Tempos (Départ & Cible) */}
              {renderTempoSelection()}

              {/* 3. Accélération & Fréquence */}
              {renderStepAndInterval()}
            </>
          ) : (
            /* --- ONGLET 2 : CRÉER / GÉRER UN ENTRAÎNEMENT (MESTRE) --- */
            <>
              {/* Pedagogical Help Box Mestre */}
              <div className="p-2.5 bg-[#ebe2cb]/70 border border-[#1a1a1a]/40 rounded-xs flex items-start gap-2 text-[11px] text-[#333] leading-relaxed">
                <GraduationCap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  {lang === 'fr'
                    ? "Définissez un défi par paliers progressifs pour vos élèves. Ils devront maintenir le tempo cible avant de valider le défi."
                    : "Defina um desafio em etapas progressivas para seus alunos. Eles deverão manter o andamento alvo para validar o desafio."}
                </p>
              </div>

              {/* Liste des défis existants sur ce morceau */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666] flex items-center gap-1.5">
                    📋 {t('speedTrainerExistingChallenges')}
                    {existingTrainings.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#1a1a1a] text-[#f4ecd8] rounded-xs text-[10px]">
                        {existingTrainings.length}
                      </span>
                    )}
                  </label>
                  {editingTrainingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-[11px] font-bold text-[#8b2a1a] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('speedTrainerNewChallenge')}
                    </button>
                  )}
                </div>

                {isLoadingTrainings ? (
                  <div className="p-4 bg-[#fcf9f2] border-2 border-[#1a1a1a] rounded-xs flex items-center justify-center gap-2 text-xs text-[#666] shadow-[2px_2px_0px_#1a1a1a]">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>{lang === 'fr' ? 'Chargement des défis...' : 'Carregando desafios...'}</span>
                  </div>
                ) : existingTrainings.length === 0 ? (
                  <div className="p-3 bg-[#fcf9f2] border-2 border-[#1a1a1a]/40 border-dashed rounded-xs text-center text-xs text-[#777] italic">
                    {t('speedTrainerNoChallenges')}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {existingTrainings.map((tr) => {
                      const isCurrentEditing = editingTrainingId === tr.id;
                      const isDeleting = isDeletingId === tr.id;
                      const sBpm = tr.stages?.[0]?.startBpm;
                      const tBpm = tr.stages?.[tr.stages.length - 1]?.targetBpm;

                      return (
                        <div
                          key={tr.id}
                          data-training-card={tr.id}
                          className={`p-2.5 rounded-xs border-2 transition-all flex items-center justify-between gap-2 shadow-[2px_2px_0px_#1a1a1a] ${
                            isCurrentEditing
                              ? 'border-amber-600 bg-amber-500/15'
                              : 'border-[#1a1a1a] bg-[#fcf9f2] hover:bg-[#fffdf9]'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-cactus font-bold text-sm text-[#1a1a1a] truncate">
                                {tr.title}
                              </span>
                              {isCurrentEditing && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-600 text-[#f4ecd8] rounded-xs uppercase">
                                  {lang === 'fr' ? 'En cours' : 'Em edição'}
                                </span>
                              )}
                            </div>
                            {/* Point 2: Affichage mesures en Base 1 (${startMeasure + 1} - ${endMeasure + 1}) */}
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] flex-wrap">
                              <span className="font-bold text-[#1a1a1a]">
                                m. {tr.startMeasure + 1} - {tr.endMeasure + 1}
                              </span>
                              <span>•</span>
                              <span>{tr.stagesCount} {lang === 'fr' ? 'paliers' : 'etapas'}</span>
                              {sBpm && tBpm && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-amber-900">
                                    {sBpm} ➔ {tBpm} BPM
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {confirmDeleteId === tr.id ? (
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              <span className="text-[11px] font-cactus font-bold text-[#8b2a1a] whitespace-nowrap">
                                {lang === 'fr' ? 'Supprimer ce défi ?' : 'Excluir este desafio?'}
                              </span>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (tr.id) handleDeleteTraining(tr.id);
                                }}
                                className="bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#6b1f13] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] px-2.5 py-1 text-xs font-bold uppercase rounded-none transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>✓ {lang === 'fr' ? 'Oui, supprimer' : 'Sim, excluir'}</>
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#e2d5b8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] px-2 py-1 text-xs font-bold uppercase rounded-none transition-all cursor-pointer"
                              >
                                ✕ {lang === 'fr' ? 'Annuler' : 'Cancelar'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditTraining(tr);
                                }}
                                title={t('speedTrainerEditChallenge')}
                                className={`p-1.5 border border-[#1a1a1a] rounded-xs font-bold transition-colors cursor-pointer ${
                                  isCurrentEditing
                                    ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                                    : 'bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (tr.id) setConfirmDeleteId(tr.id);
                                }}
                                title={t('speedTrainerDeleteChallenge')}
                                className="p-1.5 border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-red-700 hover:text-white rounded-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bannière mode édition active */}
              {editingTrainingId && (
                <div className="p-2 bg-amber-500/20 border-2 border-amber-600 rounded-xs flex items-center justify-between gap-2 shadow-[2px_2px_0px_#1a1a1a]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 truncate">
                    <Pencil className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{t('speedTrainerEditingChallenge')}</span>
                    <span className="truncate italic">"{challengeTitle}"</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[10px] font-bold px-2 py-0.5 bg-[#f4ecd8] border border-[#1a1a1a] rounded-xs hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer shrink-0"
                  >
                    {t('speedTrainerCancelEdit')}
                  </button>
                </div>
              )}

              {/* Nom du défi */}
              <div className="flex flex-col gap-1.5">
                <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                  📝 {t('speedTrainerChallengeTitle')}
                </label>
                <input
                  type="text"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder={t('speedTrainerChallengeTitlePlaceholder')}
                  className="w-full bg-[#fcf9f2] border-2 border-[#1a1a1a] py-1.5 px-3 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] focus:outline-none focus:bg-white transition-colors"
                />
              </div>

              {/* 1. Zone de travail (Mesures) */}
              {renderMeasureSelection()}

              {/* 2. Nombre de paliers */}
              <div className="flex flex-col gap-1.5">
                <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                  🪜 {t('speedTrainerStagesCount')}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setStagesCount(count)}
                      className={`py-1.5 text-xs font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
                        stagesCount === count
                          ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                          : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                      }`}
                    >
                      {count} {lang === 'fr' ? 'paliers' : 'etapas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Tempos (Départ & Cible) */}
              {renderTempoSelection()}

              {/* 4. Accélération & Fréquence */}
              {renderStepAndInterval()}

              {/* 5. Tours de maintien */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                    🛡️ {t('speedTrainerConsolidationLaps')}
                  </label>
                  <span className="text-[10px] text-[#777]">
                    {t('speedTrainerConsolidationHelp')}
                  </span>
                </div>
                <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
                  <HoldButton
                    onAction={() => setConsolidationLaps(prev => Math.max(1, prev - 1))}
                    disabled={consolidationLaps <= 1}
                    className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </HoldButton>
                  <div className="text-center flex flex-col items-center">
                    <NumberInput
                      value={consolidationLaps}
                      min={1}
                      max={8}
                      ariaLabel={t('speedTrainerConsolidationLaps')}
                      onChange={(val) => setConsolidationLaps(Math.max(1, Math.min(8, val)))}
                      className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
                    />
                    <span className="text-[9px] font-bold text-[#888]">{t('speedTrainerLaps')}</span>
                  </div>
                  <HoldButton
                    onAction={() => setConsolidationLaps(prev => Math.min(8, prev + 1))}
                    disabled={consolidationLaps >= 8}
                    className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </HoldButton>
                </div>
              </div>

              {/* 6. Aperçu dynamique des paliers calculés */}
              <div className="flex flex-col gap-1.5">
                <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                  👀 {t('speedTrainerPreviewTitle')}
                </label>
                <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2.5 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1.5">
                  {calculatedStages.map((stg) => (
                    <div
                      key={stg.stageIndex}
                      className="flex items-center justify-between text-xs font-mono py-1 px-2 border-b border-[#1a1a1a]/15 last:border-b-0 bg-[#f4ecd8]/60 rounded-xs"
                    >
                      <span className="font-bold font-cactus text-sm text-[#1a1a1a]">
                        {t('speedTrainerStage')} {stg.stageIndex}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-900 bg-amber-500/20 px-1.5 py-0.5 rounded-xs border border-amber-600/30">
                          {stg.startBpm} ➔ {stg.targetBpm} BPM
                        </span>
                        <span className="text-[10px] text-[#666]">
                          (+{stg.bpmStep} / {stg.loopInterval === 1 ? t('speedTrainerLoopsInterval') : t('speedTrainerLoopsIntervalPlural')})
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#555] font-sans font-bold flex items-center justify-between pt-1 border-t border-[#1a1a1a]/20">
                    <span>🛡️ {t('speedTrainerMaintenance')}</span>
                    <span className="text-[#8b2a1a]">{consolidationLaps} {t('speedTrainerLaps')} @ {targetBpm} BPM</span>
                  </div>
                </div>
              </div>

              {/* Feedback messages */}
              {saveSuccess && (
                <div className="p-2.5 bg-emerald-500/20 border-2 border-emerald-600 rounded-xs flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    {saveMessage || (editingTrainingId ? t('speedTrainerChallengeUpdated') : t('speedTrainerChallengeSaved'))}
                  </span>
                </div>
              )}
              {saveError && (
                <div className="p-2.5 bg-red-500/20 border-2 border-red-600 rounded-xs flex items-center gap-2 text-xs font-bold text-red-900 animate-in fade-in">
                  <X className="w-4 h-4 text-red-700 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions (Speed Trainer & Mestre Challenges) */}
        {activeTab !== 'tocarJunto' && (
          <div className="p-3 sm:p-4 bg-[#ebe2cb] border-t-2 border-[#1a1a1a] flex items-center justify-between gap-2">
            {activeTab === 'speedTrainer' ? (
              isActive ? (
                <button
                  type="button"
                  onClick={handleStopAndRestore}
                  className="w-full py-2.5 px-4 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#722215] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a1a1a] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  {t('speedTrainerStop')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunch}
                  className="w-full py-2.5 px-4 bg-amber-600 text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] hover:bg-amber-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a1a1a] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XiloLightning size={16} className="fill-current" />
                  {activeTrainingSession ? (
                    `⚡ Lancer le Palier ${activeTrainingSession.stageIndex} (${startBpm} ➔ ${targetBpm} BPM)`
                  ) : (
                    t('speedTrainerLaunch')
                  )}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveTraining}
                className={`w-full py-2.5 px-4 text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a1a1a] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  editingTrainingId
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {editingTrainingId ? t('speedTrainerUpdatingChallenge') : t('speedTrainerSavingChallenge')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingTrainingId ? t('speedTrainerUpdateChallenge') : t('speedTrainerSaveChallenge')}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
