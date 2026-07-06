/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import LZString from 'lz-string';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getLocalLibrary } from '../library';
import { ASSETS_BASE_URL, instrumentsConfig } from '../data';

export function useAppAudio() {
  const audio = useAudio();
  const sequencer = useSequencer();
  const tracks = useSequencerStore(state => state.tracks);

  const [presetFiles, setPresetFiles] = useState<string[]>([]);
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState<boolean>(false);

  const hasLoadedInitialPreset = useRef(false);
  const lastNotesSignatureRef = useRef<string>('');
  const lastTracksRef = useRef<any[]>([]);
  const audioRef = useRef<any>(audio);
  const workerRef = useRef<Worker | null>(null);

  // Sync audio ref with the latest audio context object
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/dbWorker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      if (e.data?.type === 'SAVE_SUCCESS') {
        setIsSavedIndicatorVisible(true);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Load Preset catalog and decode initial composition from URL query/hash or local storage.
  useEffect(() => {
    if (audio.isLoading) return;
    if (hasLoadedInitialPreset.current) return;
    hasLoadedInitialPreset.current = true;

    const hash = window.location.hash;
    let loadedFromHash = false;

    const tryLoadQueryOrHash = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const baqueParam = urlParams.get('baque');
        if (baqueParam) {
          const decompressed = LZString.decompressFromEncodedURIComponent(baqueParam);
          if (decompressed) {
            const preset = JSON.parse(decompressed);
            await audio.applyPreset(preset);
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
          }
        }
      } catch (err) {
        console.warn('[O Girador] Failed to decode URL query param (?ogirador=):', err);
      }

      if (hash && hash.length > 1) {
        try {
          const b64 = hash.substring(1);
          const decodedStr = decodeURIComponent(escape(window.atob(b64)));
          const preset = JSON.parse(decodedStr);
          await audio.applyPreset(preset);
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        } catch (err) {
          console.warn('[O Girador] Failed to decode URL hash:', err);
        }
      }
      return false;
    };

    tryLoadQueryOrHash().then(async (loaded) => {
      loadedFromHash = loaded;
      let restoredFromLocalStorage = false;

      if (!loadedFromHash) {
        try {
          const { getAutosave } = await import('../db');
          const savedState = await getAutosave();
          if (savedState) {
            await audio.applyPreset(savedState);
            restoredFromLocalStorage = true;
          }
        } catch (err) {
          console.error('[O Girador] Failed to restore autosave from IndexedDB:', err);
        }
      }

      fetch(`${ASSETS_BASE_URL}presets/catalog.json`)
        .then((res) => res.json())
        .then((files: string[]) => {
          setPresetFiles(files);
          if (files.length > 0 && !loadedFromHash && !restoredFromLocalStorage) {
            audio.setActivePresetName(files[0]);
            audio.loadFallbackPreset(files[0]);
          }
        })
        .catch((err) => console.error('Could not load catalog.json:', err));
    });
  }, [audio]);

  // PWA File Handler: handle files opened via the OS file handler
  useEffect(() => {
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        try {
          const fileHandle = launchParams.files[0];
          const file: File = await fileHandle.getFile();
          if (!file.name.endsWith('.json')) return;
          const text = await file.text();
          const data = JSON.parse(text);
          await audio.applyPreset(data);
        } catch (err) {
          console.error('Failed to load file from launchQueue:', err);
        }
      });
    }
  }, [audio.applyPreset]);

  // Autosave to IndexedDB using Zustand subscription
  useEffect(() => {
    if (audio.isLoading) return;
    
    let timeoutId: NodeJS.Timeout;

    const performSave = () => {
      const state = useSequencerStore.getState();
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
        isLooping: state.isLooping,
        letras: state.letras,
        metadata: state.metadata,
        masterEQ: audioRef.current.masterEQ,
        masterCompressor: audioRef.current.masterCompressor,
        masterVol: audioRef.current.masterVol,
        masterReverbVol: audioRef.current.masterReverbVol,
        reverbDecay: audioRef.current.reverbDecay,
        globalSwing: audioRef.current.globalSwing,
      };

      workerRef.current?.postMessage({ type: 'SAVE_AUTOSAVE', payload: dataToSave });
    };

    const getNotesSignature = (tracksList: any[]) => {
      return JSON.stringify(
        tracksList.map((t) => ({
          id: t.id,
          patterns: t.patterns.map((p) => ({
            id: p.id,
            steps: p.steps,
            activeSteps: p.activeSteps,
            volumes: p.volumes,
          })),
        }))
      );
    };

    // Initialize refs on mount/load
    const currentTracks = useSequencerStore.getState().tracks;
    lastTracksRef.current = currentTracks;
    if (!lastNotesSignatureRef.current) {
      lastNotesSignatureRef.current = getNotesSignature(currentTracks);
    }

    const unsub = useSequencerStore.subscribe((state) => {
      if (state.tracks === lastTracksRef.current) return;
      lastTracksRef.current = state.tracks;

      const currentSig = getNotesSignature(state.tracks);
      if (currentSig !== lastNotesSignatureRef.current) {
        lastNotesSignatureRef.current = currentSig;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(performSave, 1500);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [audio.isLoading]);

  useEffect(() => {
    if (isSavedIndicatorVisible) {
      const timer = setTimeout(() => setIsSavedIndicatorVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSavedIndicatorVisible]);

  // Default Instrument selection for keyboard play
  useEffect(() => {
    if (tracks.length > 0 && !audio.activeKeyboardInstrumentId) {
      const firstNonVoice = tracks.find(t => {
        const conf = instrumentsConfig[t.instrumentIdx];
        return conf && conf.type !== 'voice';
      });
      if (firstNonVoice) {
        audio.setActiveKeyboardInstrumentId(instrumentsConfig[firstNonVoice.instrumentIdx].id);
      } else {
        audio.setActiveKeyboardInstrumentId(instrumentsConfig[tracks[0].instrumentIdx].id);
      }
    }
  }, [tracks, audio.activeKeyboardInstrumentId]);

  const refreshLocalPresets = useCallback(async () => {
    try {
      const library = await getLocalLibrary();
      setLocalPresets(Object.keys(library));
    } catch (err) {
      console.error("Failed to load local presets:", err);
    }
  }, []);

  useEffect(() => {
    refreshLocalPresets();
  }, [refreshLocalPresets]);

  return {
    presetFiles,
    localPresets,
    isSavedIndicatorVisible,
    refreshLocalPresets,
  };
}
