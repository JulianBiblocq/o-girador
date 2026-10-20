import { useState, useCallback } from 'react';
import { SavedPattern, TimeSignature, SavedSectionData, Preset } from '../types';
import { useAudio } from '../contexts/AudioContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { telemetryService } from '../services/telemetryService';
import { renderAndUploadPatternBounce } from './cloud-bounce/cloudPatternBounce';
import { renderAndUploadSectionBounce } from './cloud-bounce/cloudSectionBounce';
import { renderAndUploadPresetBounce } from './cloud-bounce/cloudPresetBounce';

export function useCloudAudioBounce() {
  const [isBouncingCloud, setIsBouncingCloud] = useState(false);
  const [bounceError, setBounceError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>('');
  const audio = useAudio();

  const setStage = useCallback((pct: number, fr: string, pt: string) => {
    const lang = useSequencerStore.getState().lang || 'fr';
    setProgress(pct);
    setStepLabel(lang === 'pt' ? pt : fr);
  }, []);

  const genererEtUploaderCloudBounce = useCallback(async (
    patternId: string,
    patternData: SavedPattern,
    bpm: number,
    timeSig: TimeSignature
  ): Promise<string | null> => {
    setIsBouncingCloud(true);
    setBounceError(null);
    try {
      return await renderAndUploadPatternBounce(patternId, patternData, bpm, timeSig);
    } catch (err: any) {
      console.error('[Cloud Bounce] Pattern Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Pattern');
      setBounceError('Échec de la génération audio');
      return null;
    } finally {
      setIsBouncingCloud(false);
    }
  }, []);

  const genererEtUploaderSectionCloudBounce = useCallback(async (
    sectionId: string,
    sectionData: SavedSectionData,
    baseBpm: number
  ): Promise<string | null> => {
    setIsBouncingCloud(true);
    setBounceError(null);
    try {
      return await renderAndUploadSectionBounce(sectionId, sectionData, baseBpm);
    } catch (err: any) {
      console.error('[Cloud Bounce] Section Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Section');
      setBounceError('Échec de la génération audio');
      return null;
    } finally {
      setIsBouncingCloud(false);
    }
  }, []);

  const genererEtUploaderPresetCloudBounce = useCallback(async (
    presetId: string,
    presetData: Preset,
    baseBpm: number,
    options?: {
      loopMode?: number | 'infinite';
      isLoopRegionActive?: boolean;
      loopStartMeasure?: number | null;
      loopEndMeasure?: number | null;
      tenantId?: string;
      lang?: string;
    }
  ): Promise<string | null> => {
    setIsBouncingCloud(true);
    setBounceError(null);
    setProgress(0);
    try {
      return await renderAndUploadPresetBounce(
        presetId, presetData, baseBpm, audio, options, setStage, setProgress
      );
    } catch (err: any) {
      console.error('[Cloud Bounce] Preset Erreur:', err);
      telemetryService.logError(err, 'useCloudAudioBounce_Preset');
      setBounceError('Échec de la génération audio');
      return null;
    } finally {
      setIsBouncingCloud(false);
    }
  }, [audio, setStage]);

  return {
    genererEtUploaderCloudBounce,
    genererEtUploaderSectionCloudBounce,
    genererEtUploaderPresetCloudBounce,
    isBouncingCloud,
    bounceError,
    progress,
    stepLabel
  };
}
