
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TrainingProgram } from '../../types/trainings';
import { generateTrainingStages } from '../../utils/trainingCalculator';
import { fetchTrainingsByPreset } from '../../services/cloudTrainings';
import { executeSaveMestreTraining, executeDeleteMestreTraining } from './mestreTrainingApiHelpers';

export const useMestreTrainingLogic = (
  isOpen: boolean, activeTab: string, audioPresetName: string | undefined,
  metadataToada: string | undefined, startMeasure: number, endMeasure: number,
  startBpm: number, targetBpm: number, bpmStep: number, loopInterval: number,
  consolidationLaps: number, t: (key: string) => string,
  onApplySettings?: (training: TrainingProgram) => void
) => {
  const { userProfile } = useAuth();
  const isMestre = useMemo(() => {
    return ['mestre', 'mestri', 'admin'].includes(userProfile?.role || '') || Boolean(userProfile?.canWriteSequenciador);
  }, [userProfile?.role, userProfile?.canWriteSequenciador]);

  const defaultChallengeTitle = useMemo(() => {
    const songName = metadataToada?.trim() || '';
    return songName ? `Virada - ${songName}` : 'Virada';
  }, [metadataToada]);

  const [challengeTitle, setChallengeTitle] = useState<string>('');
  const [stagesCount, setStagesCount] = useState<number>(3);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingTrainings, setExistingTrainings] = useState<TrainingProgram[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState<boolean>(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resolvedPresetId = useMemo(() => {
    if (audioPresetName?.startsWith('cloud:')) return audioPresetName.replace('cloud:', '');
    const fromParam = new URLSearchParams(window.location.search).get('loadPreset');
    if (fromParam) return fromParam;
    const raw = metadataToada?.trim() || audioPresetName || '';
    return raw ? raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : '';
  }, [audioPresetName, metadataToada]);

  const effectiveGroupId = useMemo(() => (userProfile?.groupId || 'samambaia').trim(), [userProfile?.groupId]);

  const loadTrainings = useCallback(async () => {
    if (!resolvedPresetId || !effectiveGroupId) {
      setExistingTrainings([]);
      return;
    }
    setIsLoadingTrainings(true);
    try {
      const list = await fetchTrainingsByPreset(resolvedPresetId, effectiveGroupId);
      setExistingTrainings(list);
    } catch {
      setExistingTrainings([]);
    } finally {
      setIsLoadingTrainings(false);
    }
  }, [resolvedPresetId, effectiveGroupId]);

  useEffect(() => {
    if (isOpen && isMestre && activeTab === 'mestreChallenges') loadTrainings();
  }, [isOpen, isMestre, activeTab, loadTrainings]);

  const calculatedStages = useMemo(() => {
    return generateTrainingStages(Math.min(startBpm, targetBpm), targetBpm, stagesCount, bpmStep, loopInterval, consolidationLaps);
  }, [startBpm, targetBpm, stagesCount, bpmStep, loopInterval, consolidationLaps]);

  const handleStartEditTraining = (training: TrainingProgram) => {
    if (!training.id) return;
    setEditingTrainingId(training.id);
    setChallengeTitle(training.title || defaultChallengeTitle);
    setStagesCount(training.stagesCount || 3);
    onApplySettings?.(training);
  };

  const handleCancelEdit = () => {
    setEditingTrainingId(null);
    setChallengeTitle(defaultChallengeTitle);
  };

  const handleDeleteTraining = async (trainingId: string) => {
    setIsDeletingId(trainingId);
    try {
      await executeDeleteMestreTraining(trainingId);
      if (editingTrainingId === trainingId) handleCancelEdit();
      setSaveMessage(t('speedTrainerChallengeDeleted'));
      setSaveSuccess(true);
      await loadTrainings();
    } catch (err: any) {
      setSaveError(err?.message || 'Erreur');
    } finally {
      setIsDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleSaveTraining = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const freshStages = generateTrainingStages(Math.min(startBpm, targetBpm), targetBpm, stagesCount, bpmStep, loopInterval, consolidationLaps);
      await executeSaveMestreTraining({
        editingTrainingId, challengeTitle, defaultChallengeTitle, startMeasure, endMeasure,
        stagesCount, consolidationLaps, freshStages, resolvedPresetId,
        presetName: metadataToada?.trim() || audioPresetName || 'Morceau',
        effectiveGroupId, mestreId: userProfile?.uid || '',
      });
      setSaveMessage(editingTrainingId ? t('speedTrainerChallengeUpdated') : t('speedTrainerChallengeSaved'));
      setSaveSuccess(true);
      setEditingTrainingId(null);
      await loadTrainings();
    } catch (err: any) {
      setSaveError(err?.message || 'Erreur sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isMestre, challengeTitle, setChallengeTitle, stagesCount, setStagesCount, isSaving, saveSuccess, saveMessage,
    saveError, existingTrainings, isLoadingTrainings, editingTrainingId, isDeletingId, confirmDeleteId,
    setConfirmDeleteId, calculatedStages, handleStartEditTraining, handleCancelEdit, handleDeleteTraining,
    handleSaveTraining, setEditingTrainingId, setSaveSuccess, setSaveMessage, setSaveError, defaultChallengeTitle
  };
};
