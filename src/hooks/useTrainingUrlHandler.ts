/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getTrainingById } from '../services/cloudTrainings';
import { TrainingProgram } from '../types/trainings';
import { ViewMode } from './useViewRouter';
import { AudioContextType } from '../contexts/AudioContext';

interface UseTrainingUrlHandlerOptions {
  audio: AudioContextType;
  changeViewMode: (mode: ViewMode) => void;
  alertAsync?: (msg: string) => Promise<void>;
}

/**
 * Hook gérant l'interception et le chargement asynchrone des entraînements Speed Trainer
 * provenant de liens externes (ex: Organizad'Or : ?presetId=...&trainingId=...&stage=...)
 * Supporte à la fois le chargement au montage et la reprise d'instance PWA existante (launchQueue).
 */
export function useTrainingUrlHandler({ audio, changeViewMode, alertAsync }: UseTrainingUrlHandlerOptions) {
  const isHandlingRef = useRef(false);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const changeViewModeRef = useRef(changeViewMode);
  changeViewModeRef.current = changeViewMode;

  const alertAsyncRef = useRef(alertAsync);
  alertAsyncRef.current = alertAsync;

  const handleUrlParams = async (searchParams: URLSearchParams) => {
    const trainingId = searchParams.get('trainingId');
    const presetId = searchParams.get('presetId') || searchParams.get('loadPreset');
    const stageParam = searchParams.get('stage') || searchParams.get('stageIndex');

    if (!trainingId && !presetId) return;

    if (isHandlingRef.current) return;
    isHandlingRef.current = true;

    try {
      // 1. Récupération des données d'entraînement dans Firestore si trainingId est fourni
      let training: TrainingProgram | null = null;
      const targetStageIndex = stageParam ? parseInt(stageParam, 10) : 1;

      if (trainingId) {
        training = await getTrainingById(trainingId);
        if (!training) {
          console.warn(`[TrainingUrlHandler] Programme d'entraînement introuvable pour ID: ${trainingId}`);
          if (alertAsyncRef.current) {
            await alertAsyncRef.current("Le programme d'entraînement demandé est introuvable ou a été supprimé.");
          }
        }
      }

      // 2. Détermination et chargement sécurisé du morceau (Preset Cloud)
      const targetPresetId = presetId || training?.presetId;

      if (targetPresetId) {
        const cleanPresetId = targetPresetId.replace(/^cloud:/, '');
        const { getCloudPreset } = await import('../cloudLibrary');
        let presetData = await getCloudPreset(cleanPresetId);
        
        // Nouvelle tentative courte si latence réseau
        if (!presetData) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          presetData = await getCloudPreset(cleanPresetId);
        }

        if (presetData) {
          audioRef.current.setActivePresetName(`cloud:${cleanPresetId}`);
          // Anti-Race condition : attendre la fin complète de l'application et l'hydratation Zustand
          await audioRef.current.applyPreset(presetData);
        } else {
          console.warn(`[TrainingUrlHandler] Preset introuvable pour ID: ${cleanPresetId}`);
        }
      }

      // 3. Basculement immédiat vers la Roda
      changeViewModeRef.current('roda');

      // 4. Si entraînement Mestre, armement du Speed Trainer et ouverture de la modale
      if (training && training.stages && training.stages.length > 0) {
        const store = useSequencerStore.getState();
        const totalMeasures = store.totalMeasures || 1;

        // Trouver le palier ciblé (ou le 1er palier par défaut)
        const stage = training.stages.find((s) => s.stageIndex === targetStageIndex) || training.stages[0];

        if (stage) {
          // Anti-Race condition & sécurisation des bornes
          const maxMeasure = Math.max(0, totalMeasures - 1);
          const startMeasure = Math.min(training.startMeasure ?? 0, maxMeasure);
          const rawEnd = training.endMeasure !== undefined ? training.endMeasure : maxMeasure;
          const endMeasure = Math.min(Math.max(startMeasure, rawEnd), maxMeasure);
          const consolidationLaps = stage.consolidationLaps || training.consolidationLaps || 2;

          const effectiveTrainingId = training.id || trainingId || '';

          // Mémoriser la session active d'entraînement
          store.setActiveTrainingSession({
            trainingId: effectiveTrainingId,
            stageIndex: stage.stageIndex,
            consolidationLaps,
            title: training.title || 'Entraînement',
            startBpm: stage.startBpm,
            targetBpm: stage.targetBpm,
          });

          // Pré-positionner la configuration du Speed Trainer
          store.setSpeedTrainerConfig({
            startMeasure,
            endMeasure,
            startBpm: stage.startBpm,
            targetBpm: stage.targetBpm,
            bpmStep: stage.bpmStep ?? 2,
            loopInterval: stage.loopInterval ?? 1,
            consolidationLaps,
            trainingId: effectiveTrainingId,
            stageIndex: stage.stageIndex,
            stageTitle: training.title,
          });

          // Ouvrir la modale pour laisser l'élève maître du départ
          store.openSpeedTrainerModal();
        }
      }

      // 5. Nettoyage de l'URL pour éviter toute ré-exécution fortuite au rechargement
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('trainingId');
      cleanUrl.searchParams.delete('presetId');
      cleanUrl.searchParams.delete('stage');
      cleanUrl.searchParams.delete('stageIndex');
      window.history.replaceState({}, document.title, cleanUrl.toString());

    } catch (error) {
      console.error('[TrainingUrlHandler] Erreur lors du traitement des paramètres:', error);
    } finally {
      isHandlingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Analyse initiale de l'URL au montage du composant
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('trainingId') || searchParams.has('presetId')) {
        handleUrlParams(searchParams);
      }
    }

    // 2. Prise en charge standard PWA launchQueue (client_mode: "focus-existing")
    if (typeof window !== 'undefined' && 'launchQueue' in window) {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        if (launchParams.targetURL) {
          const incomingUrl = new URL(launchParams.targetURL);
          handleUrlParams(incomingUrl.searchParams);
        }
        if (launchParams.files && launchParams.files.length > 0) {
          window.dispatchEvent(new CustomEvent('pwa-launch-files', { detail: { files: launchParams.files } }));
        }
      });
    }

    // 3. Écoute de l'événement global relayé
    const handlePwaLaunchUrl = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetURL: string }>;
      if (customEvent.detail?.targetURL) {
        const incomingUrl = new URL(customEvent.detail.targetURL);
        handleUrlParams(incomingUrl.searchParams);
      }
    };
    window.addEventListener('pwa-launch-url', handlePwaLaunchUrl);

    return () => {
      window.removeEventListener('pwa-launch-url', handlePwaLaunchUrl);
    };
  }, []);
}
