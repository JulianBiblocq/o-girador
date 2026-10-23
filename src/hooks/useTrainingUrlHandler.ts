
import { useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { TrainingProgram } from '../types/trainings';
import { ViewMode } from './useViewRouter';
import { AudioContextType } from '../contexts/AudioContext';
import { resolveTrackForRole } from './training/resolveTrackForRole';
import { executeArmTrainingSession } from './training/armTrainingSession';
import { cleanTrainingUrlParams } from './training/trainingUrlParams';
import { fetchExternalTrainingPreset } from './training/fetchExternalTrainingPreset';

export { resolveTrackForRole };

interface UseTrainingUrlHandlerOptions {
  audio: AudioContextType;
  changeViewMode: (mode: ViewMode) => void;
  alertAsync?: (msg: string) => Promise<void>;
}

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

  const parseUrlParams = async (searchParams: URLSearchParams) => {
    const trainingId = searchParams.get('trainingId');
    const presetId = searchParams.get('presetId') || searchParams.get('loadPreset');
    const stageParam = searchParams.get('stage') || searchParams.get('stageIndex');
    const tocarJuntoParam = searchParams.get('tocarJunto') || searchParams.get('train');
    const roleParam = searchParams.get('role') || searchParams.get('targetTrack');
    const baseOnlyParam = searchParams.get('baseOnly');

    const isTocarJuntoRequested = tocarJuntoParam === '1' || tocarJuntoParam === 'true' || Boolean(roleParam);
    if (!trainingId && !isTocarJuntoRequested && (searchParams.has('loadPreset') || searchParams.has('loadSection') || searchParams.has('editPatternId'))) {
      return;
    }
    if (!trainingId && !presetId && !isTocarJuntoRequested) return;

    hasArmedTrainingRef.current = false;
    pendingTrainingIdRef.current = trainingId;
    pendingPresetIdRef.current = presetId;
    pendingStageRef.current = stageParam;
    pendingRoleRef.current = roleParam;
    pendingTocarJuntoRef.current = isTocarJuntoRequested;
    pendingBaseOnlyRef.current = baseOnlyParam === null ? true : (baseOnlyParam === '1' || baseOnlyParam === 'true');

    if (trainingId || presetId) {
      if (isHandlingPresetRef.current) return;
      isHandlingPresetRef.current = true;
      try {
        pendingTrainingProgramRef.current = await fetchExternalTrainingPreset({
          trainingId, presetId, alertAsync, audio: audioRef.current,
        });
      } catch (err) {
        console.error('[TrainingUrlHandler] Erreur chargement preset externe:', err);
      } finally {
        isHandlingPresetRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (hasArmedTrainingRef.current) return;
    if (!pendingTocarJuntoRef.current && !pendingTrainingIdRef.current && !pendingPresetIdRef.current) return;
    if (isHandlingPresetRef.current || isPresetLoading || !tracks || tracks.length === 0) return;

    const armed = executeArmTrainingSession({
      pendingTrainingProgram: pendingTrainingProgramRef.current,
      pendingStage: pendingStageRef.current,
      pendingTrainingId: pendingTrainingIdRef.current,
      pendingTocarJunto: pendingTocarJuntoRef.current,
      pendingRole: pendingRoleRef.current,
      pendingBaseOnly: pendingBaseOnlyRef.current,
      changeViewMode,
      cleanTrainingUrlParams,
    });
    if (armed) hasArmedTrainingRef.current = true;
  }, [tracks, isPresetLoading, changeViewMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      parseUrlParams(new URLSearchParams(window.location.search));
    }
    if (typeof window !== 'undefined' && 'launchQueue' in window) {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        if (launchParams.targetURL) parseUrlParams(new URL(launchParams.targetURL).searchParams);
        if (launchParams.files?.length > 0) {
          window.dispatchEvent(new CustomEvent('pwa-launch-files', { detail: { files: launchParams.files } }));
        }
      });
    }
    const handlePwaLaunchUrl = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetURL: string }>;
      if (customEvent.detail?.targetURL) parseUrlParams(new URL(customEvent.detail.targetURL).searchParams);
    };
    window.addEventListener('pwa-launch-url', handlePwaLaunchUrl);
    return () => window.removeEventListener('pwa-launch-url', handlePwaLaunchUrl);
  }, []);
}
