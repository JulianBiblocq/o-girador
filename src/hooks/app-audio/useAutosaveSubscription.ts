import { useEffect, useRef, useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CURRENT_AUDIO_SCALE_VERSION } from '../../utils/audioMath';

export function useAutosaveSubscription(audio: any, audioRef: React.MutableRefObject<any>) {
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const lastNotesSignatureRef = useRef<string>('');

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/dbWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === 'SAVE_SUCCESS') setIsSavedIndicatorVisible(true);
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (audio.isLoading) return;
    let timeoutId: NodeJS.Timeout;

    const performSave = () => {
      const state = useSequencerStore.getState();
      if (!state.tracks || !Array.isArray(state.tracks) || state.tracks.length === 0) return;
      const tracksCopy = state.tracks.map((t: any) => ({
        ...t,
        patterns: t.patterns.map((p: any) => {
          const { vocalAudioData, ...safePattern } = p;
          return safePattern;
        })
      }));

      const dataToSave = {
        version: 3,
        tracks: tracksCopy,
        rodaTrackOrder: state.rodaTrackOrder,
        bpm: state.bpm,
        timeSig: state.timeSig,
        totalMeasures: state.totalMeasures,
        measureTimeSigs: state.measureTimeSigs,
        measureBpms: state.measureBpms,
        measureBpmTransitions: state.measureBpmTransitions,
        measureVols: state.measureVols,
        measureVolTransitions: state.measureVolTransitions,
        songSections: state.songSections,
        songMarkers: state.songMarkers,
        measureSignals: state.measureSignals,
        loopStartMeasure: state.loopStartMeasure,
        loopEndMeasure: state.loopEndMeasure,
        isLoopRegionActive: state.isLoopRegionActive,
        loopMode: state.loopMode,
        isLooping: state.isLooping,
        letras: state.letras,
        metadata: state.metadata,
        masterEQ: audioRef.current.masterEQ,
        masterCompressor: audioRef.current.masterCompressor,
        masterVol: audioRef.current.masterVol,
        masterReverbVol: audioRef.current.masterReverbVol,
        reverbDecay: audioRef.current.reverbDecay,
        masterFX: state.masterFX,
        masterDistortion: state.masterFX?.distortion?.returnVolume,
        masterDistortionDrive: state.masterFX?.distortion?.drive,
        globalSwing: audioRef.current.globalSwing,
        audioScaleVersion: CURRENT_AUDIO_SCALE_VERSION,
      };

      workerRef.current?.postMessage({ type: 'SAVE_AUTOSAVE', payload: dataToSave });
    };

    const getStateSignature = (state: any) => JSON.stringify({
      bpm: state.bpm, timeSig: state.timeSig, totalMeasures: state.totalMeasures,
      loopMode: state.loopMode, isLooping: state.isLooping, loopStartMeasure: state.loopStartMeasure,
      loopEndMeasure: state.loopEndMeasure, isLoopRegionActive: state.isLoopRegionActive,
      metadata: state.metadata, letras: state.letras, songSections: state.songSections,
      measureBpms: state.measureBpms, measureTimeSigs: state.measureTimeSigs,
      tracks: state.tracks.map((t: any) => ({
        id: t.id, instrumentIdx: t.instrumentIdx, isMute: t.isMute, volumeVal: t.volumeVal,
        patterns: t.patterns.map((p: any) => ({ id: p.id, steps: p.steps, activeSteps: p.activeSteps }))
      })),
      masterFX: state.masterFX,
    });

    const checkAndPerformSave = () => {
      const state = useSequencerStore.getState();
      const currentSig = getStateSignature(state);
      if (currentSig !== lastNotesSignatureRef.current) {
        lastNotesSignatureRef.current = currentSig;
        performSave();
      }
    };

    const unsub = useSequencerStore.subscribe(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(checkAndPerformSave, { timeout: 1000 });
        } else {
          checkAndPerformSave();
        }
      }, 1500);
    });

    const handleForceAutosave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkAndPerformSave, 100);
    };
    window.addEventListener('force-autosave', handleForceAutosave);

    return () => {
      clearTimeout(timeoutId);
      unsub();
      window.removeEventListener('force-autosave', handleForceAutosave);
    };
  }, [audio.isLoading, audioRef]);

  useEffect(() => {
    if (isSavedIndicatorVisible) {
      const timer = setTimeout(() => setIsSavedIndicatorVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSavedIndicatorVisible]);

  return { isSavedIndicatorVisible };
}
