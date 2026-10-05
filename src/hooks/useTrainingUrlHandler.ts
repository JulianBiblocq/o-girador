/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getTrainingById } from '../services/cloudTrainings';
import { TrainingProgram } from '../types/trainings';
import { TrackGroup } from '../types';
import { instrumentsConfig } from '../data';
import { ViewMode } from './useViewRouter';
import { AudioContextType } from '../contexts/AudioContext';

interface UseTrainingUrlHandlerOptions {
  audio: AudioContextType;
  changeViewMode: (mode: ViewMode) => void;
  alertAsync?: (msg: string) => Promise<void>;
}

/**
 * Résolution tolérante du pupitre (Directives de rigueur) :
 * 1. Égalité avec l'ID numérique direct (nombre ou string).
 * 2. Attribut instrumentRoleKey issu de la nomenclature.
 * 3. Identifiant technique (t.instrumentId ou instrumentsConfig[t.instrumentIdx]?.id).
 * 4. Nom de l'instrument (t.name ou instrumentsConfig[t.instrumentIdx]?.name) avec includes.
 * 5. Nom personnalisé (t.customName) avec includes.
 */
export function resolveTrackForRole(tracks: TrackGroup[], role: string): TrackGroup | undefined {
  if (!role || !tracks || !tracks.length) return undefined;
  const cleanRole = role.toLowerCase().trim();

  // 1. Égalité avec l'ID numérique
  const numericId = parseInt(cleanRole, 10);
  const byId = tracks.find(
    (t) => t.id === Number(cleanRole) || String(t.id) === cleanRole || (!isNaN(numericId) && t.id === numericId)
  );
  if (byId) return byId;

  // 2. Attribut instrumentRoleKey issu de la nomenclature
  const byRoleKey = tracks.find((t) => (t as any).instrumentRoleKey?.toLowerCase() === cleanRole);
  if (byRoleKey) return byRoleKey;

  // 3. Identifiant technique (t.instrumentId ou instrumentsConfig[t.instrumentIdx]?.id)
  const byTechId = tracks.find((t) => {
    const instId = (t as any).instrumentId || instrumentsConfig[t.instrumentIdx]?.id;
    return typeof instId === 'string' && instId.toLowerCase() === cleanRole;
  });
  if (byTechId) return byTechId;

  // 4. Nom de l'instrument (t.name ou instrumentsConfig[t.instrumentIdx]?.name) avec includes
  const byName = tracks.find((t) => {
    if (t.isBusFolder) return false;
    const trackName = (t as any).name || instrumentsConfig[t.instrumentIdx]?.name;
    return typeof trackName === 'string' && trackName.toLowerCase().includes(cleanRole);
  });
  if (byName) return byName;

  // 5. Nom personnalisé (t.customName) avec includes
  const byCustomName = tracks.find((t) => {
    if (t.isBusFolder) return false;
    const customName = (t as any).customName;
    return typeof customName === 'string' && customName.toLowerCase().includes(cleanRole);
  });
  if (byCustomName) return byCustomName;

  return undefined;
}

/**
 * Hook gérant l'interception et le chargement asynchrone des entraînements Speed Trainer
 * et du Mode Entraînement « Jouer avec » / « Tocar Junto »
 * provenant de liens externes (ex: Organizad'Or : ?presetId=...&role=caixa&tocarJunto=1&baseOnly=1)
 * Supporte à la fois le chargement au montage et la reprise d'instance PWA existante (launchQueue).
 */
export function useTrainingUrlHandler({ audio, changeViewMode, alertAsync }: UseTrainingUrlHandlerOptions) {
  const tracks = useSequencerStore((state) => state.tracks);
  const isPresetLoading = audio.isPresetLoading;

  const isHandlingPresetRef = useRef(false);
  const hasArmedTrainingRef = useRef(false);

  const pendingTrainingIdRef = useRef<string | null>(null);
  const pendingPresetIdRef = useRef<string | null>(null);
  const pendingStageRef = useRef<string | null>(null);
  const pendingRoleRef = useRef<string | null>(null);
  const pendingTocarJuntoRef = useRef<boolean>(false);
  const pendingBaseOnlyRef = useRef<boolean>(true);
  const pendingTrainingProgramRef = useRef<TrainingProgram | null>(null);

  const audioRef = useRef(audio);
  audioRef.current = audio;

  const changeViewModeRef = useRef(changeViewMode);
  changeViewModeRef.current = changeViewMode;

  const alertAsyncRef = useRef(alertAsync);
  alertAsyncRef.current = alertAsync;

  const cleanTrainingUrlParams = () => {
    if (typeof window === 'undefined') return;
    const cleanUrl = new URL(window.location.href);
    const keysToRemove = [
      'trainingId',
      'presetId',
      'loadPreset',
      'stage',
      'stageIndex',
      'tocarJunto',
      'train',
      'role',
      'targetTrack',
      'baseOnly',
    ];
    let changed = false;
    keysToRemove.forEach((key) => {
      if (cleanUrl.searchParams.has(key)) {
        cleanUrl.searchParams.delete(key);
        changed = true;
      }
    });
    if (changed) {
      window.history.replaceState({}, document.title, cleanUrl.toString());
    }
  };

  const parseUrlParams = async (searchParams: URLSearchParams) => {
    const trainingId = searchParams.get('trainingId');
    const presetId = searchParams.get('presetId') || searchParams.get('loadPreset');
    const stageParam = searchParams.get('stage') || searchParams.get('stageIndex');
    const tocarJuntoParam = searchParams.get('tocarJunto') || searchParams.get('train');
    const roleParam = searchParams.get('role') || searchParams.get('targetTrack');
    const baseOnlyParam = searchParams.get('baseOnly');

    const isTocarJuntoRequested = tocarJuntoParam === '1' || tocarJuntoParam === 'true' || Boolean(roleParam);

    if (!trainingId && !presetId && !isTocarJuntoRequested) return;

    // Réinitialisation du verrou d'armement pour cette nouvelle requête
    hasArmedTrainingRef.current = false;

    pendingTrainingIdRef.current = trainingId;
    pendingPresetIdRef.current = presetId;
    pendingStageRef.current = stageParam;
    pendingRoleRef.current = roleParam;
    pendingTocarJuntoRef.current = isTocarJuntoRequested;
    pendingBaseOnlyRef.current = baseOnlyParam === null ? true : (baseOnlyParam === '1' || baseOnlyParam === 'true');

    // Si preset spécifique ou entraînement Firestore
    if (trainingId || presetId) {
      if (isHandlingPresetRef.current) return;
      isHandlingPresetRef.current = true;
      try {
        let training: TrainingProgram | null = null;
        if (trainingId) {
          training = await getTrainingById(trainingId);
          pendingTrainingProgramRef.current = training;
          if (!training && alertAsyncRef.current) {
            await alertAsyncRef.current("Le programme d'entraînement demandé est introuvable ou a été supprimé.");
          }
        }

        const targetPresetId = presetId || training?.presetId;
        if (targetPresetId) {
          const cleanPresetId = targetPresetId.replace(/^cloud:/, '');
          const { getCloudPreset } = await import('../cloudLibrary');
          let presetData = await getCloudPreset(cleanPresetId);
          if (!presetData) {
            await new Promise((resolve) => setTimeout(resolve, 350));
            presetData = await getCloudPreset(cleanPresetId);
          }
          if (presetData) {
            audioRef.current.setActivePresetName(`cloud:${cleanPresetId}`);
            await audioRef.current.applyPreset(presetData);
            await new Promise((resolve) => setTimeout(resolve, 50));
          } else {
            console.warn(`[TrainingUrlHandler] Preset introuvable pour ID: ${cleanPresetId}`);
          }
        }
      } catch (err) {
        console.error('[TrainingUrlHandler] Erreur chargement preset externe:', err);
      } finally {
        isHandlingPresetRef.current = false;
      }
    }
  };

  const armTrainingSession = () => {
    if (hasArmedTrainingRef.current) return;

    const store = useSequencerStore.getState();
    const currentTracks = store.tracks;
    if (!currentTracks || currentTracks.length === 0) return;

    // 1. Basculement immédiat vers la Roda
    changeViewModeRef.current('roda');

    // 2. Si entraînement Mestre Speed Trainer
    const training = pendingTrainingProgramRef.current;
    if (training && training.stages && training.stages.length > 0) {
      const totalMeasures = store.totalMeasures || 1;
      const targetStageIndex = pendingStageRef.current ? parseInt(pendingStageRef.current, 10) : 1;
      const stage = training.stages.find((s) => s.stageIndex === targetStageIndex) || training.stages[0];

      if (stage) {
        const maxMeasure = Math.max(0, totalMeasures - 1);
        const startMeasure = Math.min(training.startMeasure ?? 0, maxMeasure);
        const rawEnd = training.endMeasure !== undefined ? training.endMeasure : maxMeasure;
        const endMeasure = Math.min(Math.max(startMeasure, rawEnd), maxMeasure);
        const consolidationLaps = stage.consolidationLaps || training.consolidationLaps || 2;
        const effectiveTrainingId = training.id || pendingTrainingIdRef.current || '';

        store.setActiveTrainingSession({
          trainingId: effectiveTrainingId,
          stageIndex: stage.stageIndex,
          consolidationLaps,
          title: training.title || 'Entraînement',
          startBpm: stage.startBpm,
          targetBpm: stage.targetBpm,
        });

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

        store.openSpeedTrainerModal();
      }
    }

    // 3. Si Mode Entraînement (« Jouer avec » / « Tocar Junto »)
    if (pendingTocarJuntoRef.current) {
      let targetTrack: TrackGroup | undefined;
      if (pendingRoleRef.current) {
        targetTrack = resolveTrackForRole(currentTracks, pendingRoleRef.current);
      }

      // Si aucun rôle spécifique n'est trouvé, choisir la première piste percussive jouable
      if (!targetTrack) {
        targetTrack =
          currentTracks.find((t) => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.type !== 'voice') ||
          currentTracks[0];
      }

      if (targetTrack) {
        // Armement du mode Jouer avec (silence audio sélectif)
        store.setTocarJuntoTrack(targetTrack.id, pendingBaseOnlyRef.current);

        // Forcer l'affichage de la vue baguettes
        store.setActiveAoVivoTrackId(targetTrack.id);
        if (store.isEcoMode) {
          store.toggleEcoMode();
        }

        // Log de contrôle explicite (format strict requis)
        const trackDisplayName =
          (targetTrack as any).name ||
          targetTrack.customName ||
          instrumentsConfig[targetTrack.instrumentIdx]?.name ||
          'Piste';
        console.log('🎯 [TOCAR JUNTO SUCCÈS] Mode armé pour la piste :', trackDisplayName, '(ID:', targetTrack.id, ')');

        // Verrouillage de l'armement
        hasArmedTrainingRef.current = true;

        // Nettoyage de l'URL uniquement après succès
        cleanTrainingUrlParams();
        return;
      }
    }

    // Si c'était juste un Speed Trainer sans Tocar Junto spécifique
    if (pendingTrainingIdRef.current) {
      hasArmedTrainingRef.current = true;
      cleanTrainingUrlParams();
    }
  };

  // Écoute de l'arrivée et de la stabilisation des pistes (Anti-Race Condition)
  useEffect(() => {
    if (hasArmedTrainingRef.current) return;
    if (!pendingTocarJuntoRef.current && !pendingTrainingIdRef.current && !pendingPresetIdRef.current) return;

    // Attendre que le preset soit totalement chargé et stabilisé
    if (isHandlingPresetRef.current || isPresetLoading || !tracks || tracks.length === 0) {
      return;
    }

    armTrainingSession();
  }, [tracks, isPresetLoading]);

  useEffect(() => {
    // 1. Analyse initiale de l'URL au montage du composant
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.has('trainingId') ||
        searchParams.has('presetId') ||
        searchParams.has('loadPreset') ||
        searchParams.has('tocarJunto') ||
        searchParams.has('train') ||
        searchParams.has('role') ||
        searchParams.has('targetTrack')
      ) {
        parseUrlParams(searchParams);
      }
    }

    // 2. Prise en charge standard PWA launchQueue (client_mode: "focus-existing")
    if (typeof window !== 'undefined' && 'launchQueue' in window) {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        if (launchParams.targetURL) {
          const incomingUrl = new URL(launchParams.targetURL);
          parseUrlParams(incomingUrl.searchParams);
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
        parseUrlParams(incomingUrl.searchParams);
      }
    };
    window.addEventListener('pwa-launch-url', handlePwaLaunchUrl);

    return () => {
      window.removeEventListener('pwa-launch-url', handlePwaLaunchUrl);
    };
  }, []);
}
