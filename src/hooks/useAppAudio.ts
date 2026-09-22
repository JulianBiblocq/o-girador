/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import LZString from 'lz-string';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getLocalLibrary } from '../library';
import { ASSETS_BASE_URL, instrumentsConfig } from '../data';

export function useAppAudio() {
  const audio = useAudio();
  const sequencer = useSequencer();
  const { userProfile, loading: authLoading } = useAuth();
  const userProfileRef = useRef(userProfile);
  const tracks = useSequencerStore(state => state.tracks);

  const [presetFiles, setPresetFiles] = useState<string[]>([]);
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState<boolean>(false);

  const hasLoadedInitialPreset = useRef(false);
  const lastNotesSignatureRef = useRef<string>('');
  const lastTracksRef = useRef<any[]>([]);
  const lastMasterFXRef = useRef<any>(null);
  const audioRef = useRef<any>(audio);
  const workerRef = useRef<Worker | null>(null);

  // Sync audio ref with the latest audio context object
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

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
    if (audio.isLoading || authLoading) return;
    if (hasLoadedInitialPreset.current) return;
    hasLoadedInitialPreset.current = true;

    const hash = window.location.hash;
    let loadedFromHash = false;

    const tryLoadQueryOrHash = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Interception du paramètre ?file= pour chargement dynamique JSON distant (Firebase Storage / Deep Link)
        const fileUrl = urlParams.get('file');
        if (fileUrl) {
          try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const presetData = await response.json();
            await audio.applyPreset(presetData);
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
          } catch (err) {
            console.error('[O Girador] Échec du téléchargement du fichier JSON distant via ?file=:', err);
            if (sequencer.alertAsync) {
              sequencer.alertAsync('Impossible de télécharger le fichier distant. Le rythme par défaut a été chargé.');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            return false;
          }
        }

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

        const loadPresetId = urlParams.get('loadPreset');
        if (loadPresetId) {
          try {
            const { getCloudPreset } = await import('../cloudLibrary');
            let cloudPreset = await getCloudPreset(loadPresetId);
            // Retry once if first attempt was momentarily empty
            if (!cloudPreset) {
              await new Promise(r => setTimeout(r, 400));
              cloudPreset = await getCloudPreset(loadPresetId);
            }
            if (cloudPreset) {
              await audio.applyPreset(cloudPreset);
              window.history.replaceState({}, document.title, window.location.pathname);
              return true;
            } else {
              console.warn('[O Girador] Preset introuvable pour ID:', loadPresetId);
              if (sequencer.alertAsync) {
                sequencer.alertAsync('Le morceau demandé via le lien est introuvable ou a été supprimé.');
              }
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (e) {
            console.error('Failed to load preset from URL', e);
            if (sequencer.alertAsync) {
              sequencer.alertAsync('Impossible de charger le morceau depuis le lien partagé.');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const loadPatternId = urlParams.get('loadPattern');
        if (loadPatternId) {
          try {
            const { getCloudPattern } = await import('../cloudPatterns');
            let cloudPattern = await getCloudPattern(loadPatternId);
            if (!cloudPattern) {
              await new Promise(r => setTimeout(r, 400));
              cloudPattern = await getCloudPattern(loadPatternId);
            }
            if (cloudPattern) {
              const instConf = instrumentsConfig.find(i => i.id === cloudPattern.instrumentId) || instrumentsConfig[0];
              const instIdx = instrumentsConfig.indexOf(instConf);
              const pId = Date.now();
              const preset = {
                version: 3,
                bpm: 100,
                timeSig: '4/4',
                totalMeasures: 1,
                tracks: [
                  {
                    id: 1,
                    instrumentIdx: instIdx !== -1 ? instIdx : 0,
                    customName: cloudPattern.name,
                    patterns: [
                      {
                        ...cloudPattern,
                        id: pId,
                        measureAssignments: [true]
                      }
                    ],
                    selectedPatternId: pId,
                    volume: 80,
                    pan: 0,
                    reverbLevel: 20,
                    isMuted: false,
                    isSoloed: false,
                    isHidden: false
                  }
                ]
              };
              await audio.applyPreset(preset);
              window.history.replaceState({}, document.title, window.location.pathname);
              return true;
            }
          } catch (e) {
            console.error('Failed to load pattern from URL', e);
          }
        }
      } catch (err) {
        // console.warn('[O Girador] Failed to decode URL query param:', err);
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
          // console.warn('[O Girador] Failed to decode URL hash:', err);
        }
      }
      return false;
    };

    tryLoadQueryOrHash().then(async (loaded) => {
      loadedFromHash = loaded;
      let restoredFromLocalStorage = false;

      if (!loadedFromHash) {
        // Priorité 1 : vérifier si un preset cloud a été sauvegardé récemment (localStorage fallback)
        const lastPresetId = localStorage.getItem('girador_last_loaded_preset_id');
        if (lastPresetId) {
          try {
            const { getCloudPreset } = await import('../cloudLibrary');
            const cloudPreset = await getCloudPreset(lastPresetId);
            if (cloudPreset) {
              await audio.applyPreset(cloudPreset);
              audio.setActivePresetName(`cloud:${lastPresetId}`);
              restoredFromLocalStorage = true;
            }
          } catch (err) {
            console.warn('[O Girador] Failed to restore from localStorage preset ID, falling back to IndexedDB:', err);
          }
        }

        // Priorité 2 : autosave IndexedDB
        if (!restoredFromLocalStorage) {
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
      }

      fetch(`${ASSETS_BASE_URL}presets/catalog.json`)
        .then((res) => res.json())
        .then(async (files: string[]) => {
          setPresetFiles(files);
          if (files.length > 0 && !loadedFromHash && !restoredFromLocalStorage) {
            // Ne pas écraser si un preset a déjà été appliqué
            const currentActivePreset = audioRef.current?.activePresetName;
            if (currentActivePreset && currentActivePreset !== '') {
              return;
            }

            // Vérifier si l'utilisateur est membre d'un groupe avec un morceau vedette Cactus 🌵
            const groupId = userProfileRef.current?.groupId || userProfile?.groupId;
            if (groupId) {
              try {
                const { getDefaultGroupPresetId } = await import('../cloudGroups');
                const defaultPresetId = await getDefaultGroupPresetId(groupId);
                if (defaultPresetId) {
                  // Le morceau vedette sera chargé automatiquement par App.tsx
                  return;
                }
              } catch (e) {
                console.warn('[useAppAudio] Erreur check default group preset:', e);
              }
            }

            audio.setActivePresetName(files[0]);
            audio.loadFallbackPreset(files[0]);
          }
        })
        .catch((err) => console.error('Could not load catalog.json:', err));
    });
  }, [audio, authLoading]);

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
  // Commandement #1 respecté : toute la logique de comparaison utilise des refs (lastStateSignatureRef),
  // aucun setState React n'est déclenché par le souscripteur. Le performSave est debounced et hors cycle React.
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
      };

      workerRef.current?.postMessage({ type: 'SAVE_AUTOSAVE', payload: dataToSave });
    };

    // Empreinte légère de l'état global pour détecter tout changement pertinent
    // Utilise des refs pour éviter tout re-render React (Commandement #1)
    const getStateSignature = (state: any) => {
      return JSON.stringify({
        bpm: state.bpm,
        timeSig: state.timeSig,
        totalMeasures: state.totalMeasures,
        loopMode: state.loopMode,
        isLooping: state.isLooping,
        loopStartMeasure: state.loopStartMeasure,
        loopEndMeasure: state.loopEndMeasure,
        isLoopRegionActive: state.isLoopRegionActive,
        metadata: state.metadata,
        letras: state.letras,
        songSections: state.songSections,
        songMarkers: state.songMarkers,
        measureBpms: state.measureBpms,
        measureTimeSigs: state.measureTimeSigs,
        measureSignals: state.measureSignals,
        measureVols: state.measureVols,
        measureVolTransitions: state.measureVolTransitions,
        measureBpmTransitions: state.measureBpmTransitions,
        rodaTrackOrder: state.rodaTrackOrder,
        tracks: state.tracks.map((t: any) => ({
          id: t.id,
          instrumentIdx: t.instrumentIdx,
          isMute: t.isMute,
          volumeVal: t.volumeVal,
          reverbVal: t.reverbVal,
          panVal: t.panVal,
          patterns: t.patterns.map((p: any) => ({
            id: p.id,
            steps: p.steps,
            activeSteps: p.activeSteps,
            volumes: p.volumes,
          })),
        })),
        masterFX: state.masterFX,
      });
    };

    // Initialize refs on mount/load
    const initialState = useSequencerStore.getState();
    lastTracksRef.current = initialState.tracks;
    lastMasterFXRef.current = initialState.masterFX;
    if (!lastNotesSignatureRef.current) {
      lastNotesSignatureRef.current = getStateSignature(initialState);
    }

    const unsub = useSequencerStore.subscribe((state) => {
      const currentSig = getStateSignature(state);
      if (currentSig !== lastNotesSignatureRef.current) {
        lastNotesSignatureRef.current = currentSig;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(performSave, 1500);
      }
    });

    // Écouter l'événement 'force-autosave' pour les sauvegardes cloud immédiates
    const handleForceAutosave = () => {
      clearTimeout(timeoutId);
      // Petit délai pour laisser le setState du metadata se propager au store
      timeoutId = setTimeout(performSave, 100);
    };
    window.addEventListener('force-autosave', handleForceAutosave);

    return () => {
      clearTimeout(timeoutId);
      unsub();
      window.removeEventListener('force-autosave', handleForceAutosave);
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
