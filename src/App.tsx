/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useGameData } from './contexts/GameDataContext';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from './contexts/SequencerContext';
import { useAudio } from './contexts/AudioContext';
import { useAuth } from './contexts/AuthContext';
import LZString from 'lz-string';
import {
  audioEngine,
  inputManager,
  channels,
  meters,
  masterVolumeNode,
  reverbSends,
  masterMeterNode,
} from './hooks/useAudioSync';
import { i18n, ASSETS_BASE_URL, instrumentsConfig, getMaxTicks } from './data';
import { getLocalLibrary, deletePresetFromLibrary } from './library';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { Mixer } from './components/Mixer';
import { RightSidebar } from './components/RightSidebar';
import { useSequencerStore } from './stores/useSequencerStore';
import { InstrumentDetailEditor } from './components/InstrumentDetailEditor';
import { TouchStrokeSelector } from './components/TouchStrokeSelector';
const ConsoleMixer = lazy(() => import('./components/ConsoleMixer').then(m => ({ default: m.ConsoleMixer })));
const CircleSequencer = lazy(() => import('./components/CircleSequencer').then(m => ({ default: m.CircleSequencer })));
const TimelineSequencer = lazy(() => import('./components/TimelineSequencer').then(m => ({ default: m.TimelineSequencer })));
const QuizEngine = lazy(() => import('./components/QuizEngine').then(m => ({ default: m.QuizEngine })));
const DicteeEngine = lazy(() => import('./components/DicteeEngine').then(m => ({ default: m.DicteeEngine })));
const InspecteurEngine = lazy(() => import('./components/InspecteurEngine').then(m => ({ default: m.InspecteurEngine })));
const MestreEngine = lazy(() => import('./components/MestreEngine').then(m => ({ default: m.MestreEngine })));
const RythmeLiveEngine = lazy(() => import('./components/RythmeLiveEngine').then(m => ({ default: m.RythmeLiveEngine })));
const VaralCordel = lazy(() => import('./components/VaralCordel').then(m => ({ default: m.VaralCordel })));
const MestreStudio = lazy(() => import('./components/MestreStudio').then(m => ({ default: m.MestreStudio })));
const AoVivoOverlay = lazy(() => import('./components/AoVivoOverlay').then(m => ({ default: m.AoVivoOverlay })));
const SaveSectionModal = lazy(() => import('./components/CloudSectionModals').then(m => ({ default: m.SaveSectionModal })));
const LoadSectionModal = lazy(() => import('./components/CloudSectionModals').then(m => ({ default: m.LoadSectionModal })));
import { Home } from './components/Home';
import { LandingPage } from './components/LandingPage';
import { AdminPanel } from './components/AdminPanel';
import { PresetMetadata, Pattern, SongSection, TimeSignature, CloudRhythmSignal } from './types';
import { exportTablatureFile, printTablature, printLegendOnly } from './utils/exportTablature';
import { fetchMestreSignals } from './cloudSignals';
import { useQueryClient } from '@tanstack/react-query';
import { useCloudPresets } from './hooks/queries/useCloudPresets';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function App() {
  const CURRENT_VERSION = "3.1.2"; // Matches version.json
  const HAS_SEEN_UPDATE_KEY = `has_seen_update_${CURRENT_VERSION}`;

  // Consume contexts
  const sequencer = useSequencer();
  const audio = useAudio();
  const { hasAccess, userProfile, updateUserPreference } = useAuth();
  const { completeExercise } = useGameData();
  const [activeVaralExercise, setActiveVaralExercise] = useState<any>(null);

  // Local Layout / UI States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);
  const tracks = useSequencerStore(state => state.tracks);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [selectedExportTracks, setSelectedExportTracks] = useState<Set<number>>(new Set());
  const [selectedAnnexTracks, setSelectedAnnexTracks] = useState<Set<number>>(new Set());
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | 'info' | null>(
    window.innerWidth < 1024 ? 'letras' : 'info'
  );
  const [viewMode, setViewMode] = useState<'landing' | 'home' | 'roda' | 'console' | 'timeline' | 'quiz' | 'dictee' | 'inspecteur' | 'mestre' | 'rythmelive' | 'varal' | 'studio' | 'admin'>('landing');
  const [unlockedFolhetos, setUnlockedFolhetos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('o-girador-unlocked-folhetos');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [justUnlockedBookletId, setJustUnlockedBookletId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('o-girador-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaDark.matches) return true;
    return true; // default to true
  });
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [presetFiles, setPresetFiles] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { data: cloudPresetsData } = useCloudPresets({
    userUid: userProfile?.uid || null,
    userRole: userProfile?.role || 'visiteur',
    mestreId: userProfile?.mestreId || null
  });

  const cloudPresets = useMemo(() => {
    return (cloudPresetsData || []).map(p => ({ id: p.id, name: p.name }));
  }, [cloudPresetsData]);

  // Dialog System from Context
  const {
    customDialog,
    setCustomDialog,
    alertAsync,
    confirmAsync,
    promptAsync,
  } = sequencer;

  // A2HS install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Dynamically update document title based on language, keeping "O Girador" untranslated
  useEffect(() => {
    document.title = sequencer.lang === 'fr'
      ? 'O Girador | Séquenceur dédié au Maracatu de Baque Virado'
      : 'O Girador | Sequenciador dedicado ao Maracatu de Baque Virado';
  }, [sequencer.lang]);

  // Security route protection
  useEffect(() => {
    // 🛡️ FIX (Audit): Protect 'mestre' and 'varal' views from anonymous visitors
    if (['quiz', 'dictee', 'inspecteur', 'rythmelive', 'mestre', 'varal'].includes(viewMode) && !hasAccess('admin')) {
      setViewMode('roda');
    }
    if (viewMode === 'studio' && !hasAccess('admin')) {
      setViewMode('roda');
    }
    if (viewMode === 'admin' && !hasAccess('admin')) {
      setViewMode('roda');
    }
  }, [viewMode, hasAccess]);

  // Cloud sync for Dark Mode
  useEffect(() => {
    if (userProfile && userProfile.isDarkMode !== undefined) {
      setIsDarkMode(userProfile.isDarkMode);
    }
  }, [userProfile?.isDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (userProfile) {
      updateUserPreference('isDarkMode', newMode);
    }
  };

  const [mestreSignals, setMestreSignals] = useState<CloudRhythmSignal[]>([]);
  const [hideGlobalSignals, setHideGlobalSignals] = useState(false);

  const filteredMestreSignals = useMemo(() => {
    if (!hideGlobalSignals) return mestreSignals;
    return mestreSignals.filter(s => s.mestreId !== 'global');
  }, [mestreSignals, hideGlobalSignals]);

  const refreshMestreSignals = async () => {
    const isMestreAdmin = userProfile?.role === 'mestre' || userProfile?.role === 'admin';
    const isEleve = hasAccess('eleve');
    
    let targetMestreId = null;
    if (isMestreAdmin) {
      targetMestreId = userProfile?.mestreId || userProfile?.uid;
    } else if (isEleve) {
      targetMestreId = userProfile?.mestreId;
    }

    if (targetMestreId) {
      const { signals } = await fetchMestreSignals(targetMestreId);
      setMestreSignals(signals);
    } else {
      // Even if no mestre ID, we can fetch 'global' signals
      const { signals } = await fetchMestreSignals('global');
      setMestreSignals(signals);
    }
  };

  useEffect(() => {
    refreshMestreSignals();
  }, [userProfile?.uid, userProfile?.mestreId, userProfile?.role]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
      }
      setDeferredPrompt(null);
    }
  };

  // SW Update Handler
  const handleAppUpdate = async (reg: ServiceWorkerRegistration) => {
    const shouldUpdate = await confirmAsync(
      sequencer.lang === 'fr' 
        ? "Une nouvelle version de O Girador est disponible. Recharger pour mettre à jour ?"
        : "Uma nova versão do O Girador está disponível. Recarregar para atualizar ?"
    );
    if (shouldUpdate) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            if (key.includes('workbox') || key.includes('o-girador')) {
              await caches.delete(key);
            }
          }
        }
      } catch (err) {
        console.warn('Error clearing caches:', err);
      }
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (err) {
          console.warn('Error unregistering service workers:', err);
        }
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    const handleSWUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
      handleAppUpdate(customEvent.detail);
    };
    window.addEventListener('sw-update-available', handleSWUpdateEvent);
    return () => window.removeEventListener('sw-update-available', handleSWUpdateEvent);
  }, [sequencer.lang]);

  // Check remote version
  useEffect(() => {
    const checkVersion = async () => {
      if (!navigator.onLine) return;
      try {
        const response = await fetch(
          `${window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/'}version.json?t=${Date.now()}`
        );
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data && typeof data === 'object' && 'version' in data) {
              const latestVersion = String(data.version);
              if (latestVersion && latestVersion !== "undefined" && latestVersion !== CURRENT_VERSION) {
                const shouldUpdate = await confirmAsync(
                  sequencer.lang === 'fr' 
                    ? "Une nouvelle version de O Girador est disponible. Recharger pour mettre à jour ?"
                    : "Uma nova versão do O Girador está disponível. Recarregar para atualizar ?"
                );
                if (shouldUpdate) {
                  let refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                      refreshing = true;
                      window.location.reload();
                    }
                  });
                  try {
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const key of keys) {
                        if (key.includes('workbox') || key.includes('o-girador')) {
                          await caches.delete(key);
                        }
                      }
                    }
                  } catch (err) {}
                  try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                      await registration.unregister();
                    }
                  } catch (err) {}
                  window.location.reload();
                }
              }
            }
          }
        }
      } catch (err) {}
    };
    const timer = setTimeout(checkVersion, 3000);
    return () => clearTimeout(timer);
  }, [sequencer.lang]);
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Security: Do not trigger if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      const key = e.key.toLowerCase();
      
      switch (key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            sequencer.handleRedo && sequencer.handleRedo();
          } else {
            sequencer.handleUndo && sequencer.handleUndo();
          }
          break;
        case 'a':
        case 'x':
        case 'c':
        case 'v':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('grid-shortcut', { detail: { key } }));
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [sequencer]);

  // Context menu prevention on UI elements
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target && (
          target.tagName === 'IMG' || 
          (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range') ||
          target.classList.contains('vertical-fader') ||
          target.closest('.vertical-fader')
        )
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Panel sizing responsive collapsing
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        if (!activeRightPanel) setActiveRightPanel('letras');
      } else {
        if (viewMode === 'roda' && !activeRightPanel) {
          setActiveRightPanel('letras');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, activeRightPanel]);

  useEffect(() => {

  }, []);

  // Sync theme
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('o-girador-theme', theme);
  }, [isDarkMode]);

  // Local folhetos persistence
  useEffect(() => {
    localStorage.setItem('o-girador-unlocked-folhetos', JSON.stringify(unlockedFolhetos));
  }, [unlockedFolhetos]);

  const unlockBooklet = (id: string) => {
    setUnlockedFolhetos((prev) => {
      if (prev.includes(id)) return prev;
      setJustUnlockedBookletId(id);
      setViewMode('varal');
      return [...prev, id];
    });
  };

  const handleGameSuccess = (moduleName: string) => {
    const normalizedName = moduleName === 'rythme_live' ? 'rythmelive' : (moduleName === 'sablier_mestre' ? 'mestre' : moduleName);
    unlockBooklet(`folheto_${normalizedName}`);
    if (activeVaralExercise) {
      completeExercise(activeVaralExercise.id);
      setViewMode('varal');
      setActiveVaralExercise(null);
    }
  };

  const handleGameExit = () => {
    if (activeVaralExercise) {
      setViewMode('varal');
      setActiveVaralExercise(null);
    } else {
      setViewMode('roda');
    }
  };

  const hasLoadedInitialPreset = useRef(false);

  // Load Preset catalog and decode initial composition from URL query/hash or local storage.
  // We wait for isLoading to become false (samples ready) before restoring any preset,
  // to avoid stale closure and race condition issues with applyPreset.
  useEffect(() => {
    // Only trigger once, and only after the audio engine has finished loading samples
    if (audio.isLoading) return;
    if (hasLoadedInitialPreset.current) return;
    hasLoadedInitialPreset.current = true;

      const hash = window.location.hash;
      let loadedFromHash = false;

      const tryLoadQueryOrHash = async () => {
        // 1. Try URL query parameter '?ogirador='
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const baqueParam = urlParams.get('baque');
          if (baqueParam) {
            const decompressed = LZString.decompressFromEncodedURIComponent(baqueParam);
            if (decompressed) {
              const preset = JSON.parse(decompressed);
              await audio.applyPreset(preset);
              // Clean URL immediately to keep address bar clean
              window.history.replaceState({}, document.title, window.location.pathname);
              return true;
            }
          }
        } catch (err) {
          console.warn('[O Girador] Failed to decode URL query param (?ogirador=):', err);
        }

        // 2. Try URL Hash '#...base64...'
        if (hash && hash.length > 1) {
          try {
            const b64 = hash.substring(1);
            const decodedStr = decodeURIComponent(escape(window.atob(b64)));
            const preset = JSON.parse(decodedStr);
            await audio.applyPreset(preset);
            // Clean URL immediately to keep address bar clean
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

        // Try to load autosave from IndexedDB
        if (!loadedFromHash) {
          try {
            const { getAutosave } = await import('./db');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.isLoading]);




  // PWA File Handler: handle files opened via the OS file handler (launchQueue API)
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

  const refreshLocalPresets = async () => {
    try {
      const library = await getLocalLibrary();
      setLocalPresets(Object.keys(library));
    } catch (err) {
      console.error("Failed to load local presets:", err);
    }
  };

  useEffect(() => {
    refreshLocalPresets();
  }, []);

  // InputManager Keyboard Listeners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (inputManager) inputManager.handleKeyDown(e);
    };
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (inputManager) inputManager.handleKeyUp(e);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  // Keyboard Shortcuts (Spacebar & Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName || '';
      const activeId = document.activeElement?.id || '';

      // Ignore global shortcuts if user is typing in an input or textarea
      if (
        activeTag === 'INPUT' ||
        activeTag === 'SELECT' ||
        activeTag === 'TEXTAREA' ||
        activeId === 'letras-textarea'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        audio.handleTogglePlay();
      }

      const isUndoKey = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      const isRedoKey = 
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey));
      
      if (isUndoKey) {
        e.preventDefault();
        sequencer.handleUndo();
      } else if (isRedoKey) {
        e.preventDefault();
        sequencer.handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audio.handleTogglePlay, sequencer.handleUndo, sequencer.handleRedo]);

  // Autosave
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState<boolean>(false);
  const lastNotesSignatureRef = useRef<string>('');
  const lastTracksRef = useRef<any[]>([]);
  const audioRef = useRef<any>(audio);

  // Sync audio ref with the latest audio context object
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);
  
  // Autosave to localStorage using Zustand subscription
  useEffect(() => {
    if (audio.isLoading) return;
    
    let timeoutId: NodeJS.Timeout;

    const performSave = async () => {
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
      try {
        const { saveAutosave } = await import('./db');
        await saveAutosave(dataToSave);
        setIsSavedIndicatorVisible(true);
      } catch (err) {
        console.error('Failed to autosave state to IndexedDB:', err);
      }
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
      // Early-out if tracks reference did not change (e.g. currentMeasure changed)
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

  // Touch selector Bubble states
  const [touchSelector, setTouchSelector] = useState<any | null>(null);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);

  // Progression State
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [activeCordeIndex, setActiveCordeIndex] = useState<number | null>(null);

  // Cloud Section State
  const [sectionToSave, setSectionToSave] = useState<SongSection | null>(null);
  const [loadSectionInsertMeasure, setLoadSectionInsertMeasure] = useState<number | null>(null);
  const [measureWidth, setMeasureWidth] = useState<number>(480);
  const [mobileTab, setMobileTab] = useState<'roda' | 'mixer' | 'toada'>('roda');

  const t = (key: string) => {
    return (i18n[sequencer.lang] as any)[key] || key;
  };

  const handleTimeSigChange = async (selectValue: TimeSignature) => {
    const shouldResize = await confirmAsync(t('confirmResize'));
    if (shouldResize) {
      sequencer.pushUndoState();
      sequencer.setTimeSig(selectValue);
      audio.currentStepIndexRef.current = -1;
      audio.setCurrentMeasure(0);
      
      let targetSteps = 16;
      if (selectValue === '3/4' || selectValue === '6/8') targetSteps = 12;
      if (selectValue === '2/4') targetSteps = 8;
      if (selectValue === '12/8') targetSteps = 24;

      const tracks = useSequencerStore.getState().tracks;
      const resizedList = tracks.map((t) => {
        const nextPatterns = t.patterns.map(p => {
          const nextStepsArr = Array(targetSteps).fill(0);
          const nextLyrics = Array(targetSteps).fill('');
          const nextNotes = Array(targetSteps).fill('');
          const nextVols = Array(targetSteps).fill(80);
          const nextDecays = Array(targetSteps).fill(100);

          for (let idx = 0; idx < Math.min(targetSteps, p.steps); idx++) {
            nextStepsArr[idx] = p.activeSteps[idx];
            nextLyrics[idx] = p.lyrics?.[idx] || '';
            nextNotes[idx] = p.notes?.[idx] || '';
            if (p.volumes && p.volumes[idx] !== undefined) nextVols[idx] = p.volumes[idx];
            if (p.decays && p.decays[idx] !== undefined) nextDecays[idx] = p.decays[idx];
          }

          return {
            ...p,
            steps: targetSteps,
            activeSteps: nextStepsArr,
            lyrics: nextLyrics,
            notes: nextNotes,
            volumes: nextVols,
            decays: nextDecays,
          };
        });

        return {
          ...t,
          patterns: nextPatterns
        };
      });
      useSequencerStore.getState().setTracks(resizedList);
    }
  };

  const handleTrackInstrumentIdxChange = (id: number, targetInstIdx: number) => sequencer.handleTrackInstrumentIdxChange(id, targetInstIdx);
  const handleTrackMuteToggle = (id: number) => sequencer.handleTrackMuteToggle(id);
  const handleTrackSoloToggle = (id: number) => sequencer.handleTrackSoloToggle(id);
  const handleTrackHideToggle = (id: number) => sequencer.handleTrackHideToggle(id);
  const handleTrackDelete = (id: number) => sequencer.handleTrackDelete(id);
  const handleTrackVolumeChange = (id: number, val: number) => sequencer.handleTrackVolumeChange(id, val);
  const handleTrackReverbChange = (id: number, val: number) => sequencer.handleTrackReverbChange(id, val);
  const handleTrackStepVolumeChange = (tId: number, pId: number, sIdx: number | number[], val: number) => sequencer.handleTrackStepVolumeChange(tId, pId, sIdx, val);
  const handleTrackStepDecayChange = (tId: number, pId: number, sIdx: number | number[], val: number) => sequencer.handleTrackStepDecayChange(tId, pId, sIdx, val);
  const handleTrackStepMicrotimingChange = (tId: number, pId: number, sIdx: number | number[], val: number) => sequencer.handleTrackStepMicrotimingChange(tId, pId, sIdx, val);
  const handleResetTrackMicrotimings = (tId: number, pId: number) => sequencer.handleResetTrackMicrotimings(tId, pId);
  const handleTrackPanChange = (id: number, val: number) => sequencer.handleTrackPanChange(id, val);
  const handleTrackStepsChange = (tId: number, pId: number, s: number) => sequencer.handleTrackStepsChange(tId, pId, s);
  const handleTimelinePatternAssign = (tId: number, pId: number | null, mIdx: number) => sequencer.handleTimelinePatternAssign(tId, pId, mIdx);
  const handleMeasureTimeSigChange = (mIdx: number, val: TimeSignature) => sequencer.handleMeasureTimeSigChange(mIdx, val);
  const handleMeasureBpmChange = (mIdx: number, val: number) => sequencer.handleMeasureBpmChange(mIdx, val);
  const handleMeasureTransitionChange = (mIdx: number, val: 'immediate' | 'ramp') => sequencer.handleMeasureTransitionChange(mIdx, val);
  const handleMeasureVolChange = (mIdx: number, val: number) => sequencer.handleMeasureVolChange(mIdx, val);
  const handleMeasureVolTransitionChange = (mIdx: number, val: 'immediate' | 'ramp') => sequencer.handleMeasureVolTransitionChange(mIdx, val);
  const handleTotalMeasuresChange = (val: number) => sequencer.handleTotalMeasuresChange(val);
  const handleDeleteMeasure = (mIdx: number) => sequencer.handleDeleteMeasure(mIdx);
  const handleInsertMeasure = (mIdx: number) => sequencer.handleInsertMeasure(mIdx);
  const handleSetLoopStart = (mIdx: number) => sequencer.handleSetLoopStart(mIdx);
  const handleSetLoopEnd = (mIdx: number) => sequencer.handleSetLoopEnd(mIdx);
  const handleClearLoop = () => sequencer.handleClearLoop();
  const handleCopyPattern = (ptn: Pattern) => sequencer.handleCopyPattern(ptn);
  const handlePastePattern = (tId: number, pId?: number) => sequencer.handlePastePattern(tId, pId);
  const handleLoadLibraryPattern = (tId: number, targetPtnId: number, libPattern: any) => sequencer.handleLoadLibraryPattern(tId, targetPtnId, libPattern);
  const handleCreateSongSection = (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => sequencer.handleCreateSongSection(name, start, end, color, repeatCount, level);
  const handleUpdateSongSection = (id: string, name: string, start: number, end: number, color?: string, level?: number) => sequencer.handleUpdateSongSection(id, name, start, end, color, level);
  const handleDeleteSongSection = (id: string) => sequencer.handleDeleteSongSection(id);
  const handleCopySongSection = (sec: SongSection) => sequencer.handleCopySongSection(sec);
  const handlePasteSongSection = (dest: number) => sequencer.handlePasteSongSection(dest);
  const handleStepValueSelectAndToggle = (tId: number, pId: number, sIdx: number, state: string | number, l?: string, n?: string) => sequencer.handleStepValueSelectAndToggle(tId, pId, sIdx, state, l, n);
  const handleVoiceTypeToggle = (tId: number, pId: number, sIdx: number) => sequencer.handleVoiceTypeToggle(tId, pId, sIdx);
  const handleVoiceSylChange = (tId: number, pId: number, sIdx: number, val: string) => sequencer.handleVoiceSylChange(tId, pId, sIdx, val);
  const handleVoiceNoteChange = (tId: number, pId: number, sIdx: number, val: string) => sequencer.handleVoiceNoteChange(tId, pId, sIdx, val);
  const handleVoiceNoteBlur = (tId: number, pId: number, sIdx: number, val: string) => sequencer.handleVoiceNoteBlur(tId, pId, sIdx, val);
  const handleExtractLyrics = () => sequencer.handleExtractLyrics();
  const handleTrackStepValueChange = (tId: number, pId: number, sIdx: number | number[], val: string | string[], l?: string[], n?: string[]) => sequencer.handleTrackStepValueChange(tId, pId, sIdx, val, l, n);
  const handleTrackStepKeyDown = (tId: number, pId: number, sIdx: number, k: string, w: string, el: HTMLInputElement) => sequencer.handleTrackStepKeyDown(tId, pId, sIdx, k, w, el);

  const handleStepTouchStart = (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => {
    if ('button' in e && e.button !== 0) return;
    
    let clickX = 0;
    let clickY = 0;
    
    const target = e.currentTarget as HTMLElement;
    if (target && target.tagName.toLowerCase() === 'canvas') {
      if ('clientX' in e) {
        clickX = e.clientX;
        clickY = e.clientY;
      } else if ('touches' in e && e.touches.length > 0) {
        clickX = e.touches[0].clientX;
        clickY = e.touches[0].clientY;
      }
    } else {
      const rect = target.getBoundingClientRect();
      clickX = rect.left + rect.width / 2;
      clickY = rect.top;
    }

    setTouchSelector({
      patternId,
      stepIdx,
      instId,
      x: clickX,
      y: clickY,
      currentVal,
      onSelect,
      isStickyDefault: e.type !== 'touchstart'
    });
    setHoveredStroke(String(currentVal));
  };

  const handlePresetSelect = (val: string) => audio.handlePresetSelect(val);
  const handleShare = () => audio.handleShare();
  const handleSaveState = () => audio.handleSaveState();
  const handleLoadState = (file: File) => audio.handleLoadState(file);
  const handleSaveToLocal = async () => {
    if (userProfile?.role === 'mestre' || userProfile?.role === 'admin') {
      const isPt = sequencer.lang === 'pt';
      const wantCloud = await confirmAsync(
        isPt ? 'Onde você deseja salvar esta composição?' : 'Où souhaitez-vous sauvegarder cette composition ?',
        isPt ? '☁️ Nuvem (Catálogo)' : '☁️ Cloud (Catalogue)',
        isPt ? '💾 Local (Meu PC)' : '💾 Local (Mon PC)'
      );
      if (wantCloud) {
        const presetData = audio.getCurrentPresetData();
        let name = presetData.metadata?.toada?.trim() || '';
        if (!name) {
          const inputName = await promptAsync(isPt ? 'Nome do ritmo:' : 'Nom du rythme :');
          if (!inputName) return;
          name = inputName.trim();
          presetData.metadata = { ...presetData.metadata, toada: name } as any;
        }

        let visibility: 'admin_global' | 'mestre_group' | 'specific_user' = 'mestre_group';
        let targetUserId: string | undefined = undefined;

        if (userProfile.role === 'admin') {
          const makeGlobal = await confirmAsync(
            isPt ? 'Tornar global (visível para todos)?' : 'Rendre global (visible par tous) ?',
            isPt ? 'Sim (Global)' : 'Oui (Global)',
            isPt ? 'Não (Restrito)' : 'Non (Restreint)'
          );
          if (makeGlobal) {
            visibility = 'admin_global';
          } else {
            const specificTarget = await promptAsync(
              isPt ? 'Digite o UID de um visitante/Mestre alvo (ou deixe vazio para você mesmo):' : 'Entrez l\'UID du visiteur privilégié ou du Mestre (laissez vide pour vous-même) :'
            );
            if (specificTarget && specificTarget.trim() !== '') {
              visibility = 'specific_user';
              targetUserId = specificTarget.trim();
            }
          }
        }

        const { savePresetToCloud } = await import('./cloudLibrary');
        try {
          await savePresetToCloud(name, presetData, userProfile.uid, visibility, targetUserId);
          await alertAsync(isPt ? '✅ Salvo na nuvem!' : '✅ Sauvegardé dans le cloud !');
          queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
        } catch (err) {
          console.error(err);
          if (!navigator.onLine) {
            const msg = isPt
              ? 'Salvo localmente, sincronização pendente'
              : 'Sauvegardé localement, synchronisation en attente';
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          } else {
            await alertAsync('Error saving to cloud');
          }
        }
        return;
      }
    }
    audio.handleSaveToLocal();
  };
  const handleLoadLocalPreset = (name: string) => audio.handleLoadLocalPreset(name);
  const handleAddTrackInstrument = (instIdx: number) => sequencer.handleAddTrackInstrument(instIdx, useSequencerStore.getState().currentMeasure);

  const handleExportTablature = React.useCallback(() => {
    // By default, select all non-excluded tracks (apito, voice are excluded anyway, but we can check them or just check all)
    const tracks = useSequencerStore.getState().tracks;
    const validTrackIds = tracks
      .filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.id !== 'voice')
      .map(t => t.id);
      
    setSelectedExportTracks(new Set(validTrackIds));
    setSelectedAnnexTracks(new Set());
    setShowExportMenu(true);
  }, [setSelectedExportTracks, setSelectedAnnexTracks, setShowExportMenu]);
  
  const executeExport = (wantsPrint: boolean) => {
    setShowExportMenu(false);
    
    // Filter tracks based on selection
    const tracksToExport = useSequencerStore.getState().tracks.filter(t => selectedExportTracks.has(t.id));
    
    if (wantsPrint) {
      printTablature(tracksToExport, selectedAnnexTracks, useSequencerStore.getState().totalMeasures, useSequencerStore.getState().songSections, sequencer.metadata, useSequencerStore.getState().measureTimeSigs, sequencer.measureBpms, sequencer.letras);
    } else {
      exportTablatureFile(tracksToExport, selectedAnnexTracks, useSequencerStore.getState().totalMeasures, useSequencerStore.getState().songSections, sequencer.metadata, useSequencerStore.getState().measureTimeSigs, sequencer.measureBpms, sequencer.letras);
    }
  };

  // Game Engine state definitions
  const [inspecteurCaixaParfaite, setInspecteurCaixaParfaite] = useState<number>(0);
  const [inspecteurCaixaErreur, setInspecteurCaixaErreur] = useState<number>(0);
  const [mestreRhythmState, setMestreRhythmState] = useState<number>(0);

  return (
    <>
      {viewMode === 'landing' ? (
        <LandingPage onEnter={() => setViewMode('roda')} lang={sequencer.lang} />
      ) : viewMode === 'home' ? (
        <Home onEnter={(mode) => setViewMode(mode as any)} lang={sequencer.lang} />
      ) : (
        <div className="flex flex-col h-dvh text-[var(--cordel-text)] bg-[var(--cordel-bg)] overflow-hidden select-none font-sans relative">
      {/* Visual buffer loader loading overlay */}
      {audio.isLoading && (
        <div id="loading-overlay" className="absolute inset-0 bg-[#121212]/90 flex flex-col items-center justify-center z-[9999] gap-2.5">
          <span className="text-3xl">🌿</span>
          <span className="text-xl font-bold font-cactus tracking-wider text-[#f1c40f]">
            {t('loading')}
          </span>
        </div>
      )}

      {/* Header controls bar */}
      <Header
        showInstallButton={!!deferredPrompt}
        onInstallClick={handleInstallClick}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onExportTablature={handleExportTablature}
        onAdminClick={() => setViewMode('admin')}
        presetFiles={presetFiles}
        localPresets={localPresets}
        cloudPresets={cloudPresets}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
        viewMode={viewMode as any}
        onViewModeToggle={(mode) => {
          setViewMode(mode);
          if (mode === 'console' || mode === 'timeline') {
            setActiveRightPanel(null);
          } else if (mode === 'roda') {
            if (window.innerWidth >= 1024) {
              setActiveRightPanel('letras');
            }
          }
        }}
        isMobile={isMobile}
        mobileTab={mobileTab}
        onMobileTabToggle={setMobileTab}
        version={CURRENT_VERSION}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <div id="main-workspace" className="flex flex-grow min-h-0 overflow-hidden relative w-full mobile-stack cordel-bg">
        {viewMode === 'roda' && (
          <>
            {/* Left column tracks mixers */}
            {(!isMobile || mobileTab === 'mixer') && (
              <Mixer
                onStepTouchStart={handleStepTouchStart}
                onCopyPattern={handleCopyPattern}
                onPastePattern={handlePastePattern}
                onLoadLibraryPattern={handleLoadLibraryPattern}
                canPaste={!!sequencer.copiedPattern}
              />
            )}

            {/* Center circle visual canvas engine */}
            {(!isMobile || mobileTab === 'roda') && (
              <CircleSequencer
                isMobile={isMobile}
                mestreSignals={filteredMestreSignals}
                onStepTouchStart={handleStepTouchStart}
              />
            )}
          </>
        )}
        {viewMode === 'console' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
            <ConsoleMixer
              isMobile={isMobile}
              onStepTouchStart={handleStepTouchStart}
            />
          </div>
        )}
        {viewMode === 'timeline' && (
          <TimelineSequencer
            isMobile={isMobile}
            measureWidth={measureWidth}
            onMeasureWidthChange={setMeasureWidth}
            onExportTablature={handleExportTablature}
            onSaveCloudSection={setSectionToSave}
            onLoadCloudSection={setLoadSectionInsertMeasure}
            mestreSignals={filteredMestreSignals}
          />
        )}

        {viewMode === 'quiz' && (
          <QuizEngine
            lang={sequencer.lang}
            onExit={handleGameExit}
            onSuccess={() => handleGameSuccess('quiz')}
            exerciseData={activeVaralExercise}
          />
        )}

        {viewMode === 'dictee' && (
          <DicteeEngine
            lang={sequencer.lang}
            onExit={handleGameExit}
            onSuccess={() => handleGameSuccess('dictee')}
            exerciseData={activeVaralExercise}
          />
        )}

        {viewMode === 'inspecteur' && (
          // 🛡️ FIX (Audit): Wrap lazy component in Suspense
          <Suspense fallback={<div>Chargement...</div>}>
            <InspecteurEngine
              lang={sequencer.lang}
              onExit={handleGameExit}
              exerciseData={activeVaralExercise}
              onSuccess={() => handleGameSuccess('inspecteur')}
            />
          </Suspense>
        )}

        {viewMode === 'mestre' && (
          <MestreEngine
            lang={sequencer.lang}
            onExit={handleGameExit}
            rhythmState={mestreRhythmState}
            setRhythmState={setMestreRhythmState}
            onSuccess={() => handleGameSuccess('sablier_mestre')}
            exerciseData={activeVaralExercise}
          />
        )}

        {viewMode === 'rythmelive' && (
          <RythmeLiveEngine
            lang={sequencer.lang}
            onExit={handleGameExit}
            onSuccess={() => handleGameSuccess('rythme_live')}
            exerciseData={activeVaralExercise}
          />
        )}

        {viewMode === 'varal' && (
          // 🛡️ FIX (Audit): Wrap lazy component in Suspense
          <Suspense fallback={<div>Chargement...</div>}>
            <VaralCordel
              lang={sequencer.lang}
              onExit={() => setViewMode('roda')}
              unlockedFolhetos={unlockedFolhetos}
              justUnlockedBookletId={justUnlockedBookletId}
              onClearJustUnlocked={() => setJustUnlockedBookletId(null)}
              onLaunchExercise={(ex, cordeIndex) => {
                setActiveVaralExercise(ex);
                setActiveCordeIndex(cordeIndex);
                if (ex.module === 'quiz') setViewMode('quiz');
                else if (ex.module === 'dictee') setViewMode('dictee');
                else if (ex.module === 'inspecteur') setViewMode('inspecteur');
                else if (ex.module === 'rythme_live') setViewMode('rythmelive');
                else if (ex.module === 'sablier_mestre') setViewMode('mestre');
              }}
            />
          </Suspense>
        )}

        {viewMode === 'studio' && (
          <Suspense fallback={<div className="flex-1 flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col relative z-20">
              <MestreStudio
                lang={sequencer.lang}
                onExit={() => setViewMode('roda')}
                presetFiles={presetFiles}
                localPresets={localPresets}
              />
            </div>
          </Suspense>
        )}

        {viewMode === 'admin' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
            <AdminPanel />
          </div>
        )}

        {/* Right drawer sidebar context panel */}
        {viewMode === 'roda' && (!isMobile || mobileTab === 'toada') && (
          <RightSidebar
            activePanel={isMobile ? (activeRightPanel || 'letras') : 'info'}
            onTogglePanel={(p) => {
              if (isMobile) {
                setActiveRightPanel(activeRightPanel === 'letras' ? 'legend' : 'letras');
              } else {
                // On PC, the right panel handles its own tabs now, but we'll leave this empty just in case.
              }
            }}
            isMobile={isMobile}
            mestreSignals={filteredMestreSignals}
            refreshMestreSignals={refreshMestreSignals}
            hideGlobalSignals={hideGlobalSignals}
            onToggleHideGlobalSignals={() => setHideGlobalSignals(!hideGlobalSignals)}
          />
        )}
      </div>

      {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && viewMode !== 'admin' && (
        <TransportBar
          viewMode={viewMode as any}
          onViewModeToggle={(mode) => setViewMode(mode)}
          isMobile={isMobile}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}
      {touchSelector && (
        <TouchStrokeSelector
          selector={touchSelector}
          hoveredStroke={hoveredStroke}
          setHoveredStroke={setHoveredStroke}
          onClose={() => {
            setTouchSelector(null);
            setHoveredStroke(null);
          }}
        />
      )}

      {/* Autosave status indicator */}
      <div
        className={`fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[11px] font-bold border-2 border-[var(--cordel-border)] shadow-[2px_2px_0_var(--cordel-border)] transition-all duration-300 pointer-events-none ${
          isSavedIndicatorVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        <span>{sequencer.lang === 'pt' ? 'Salvo' : 'Sauvegardé'}</span>
      </div>

      {/* Export Menu Modal */}
      {showExportMenu && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm select-none">
          <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] p-6 max-w-sm w-full mx-4 flex flex-col gap-5">
            <h2 className="font-cactus text-2xl font-bold border-b-2 border-[var(--cordel-border)] pb-2">
              {sequencer.lang === 'fr' ? 'Exportation Tablature' : 'Exportar Partitura'}
            </h2>
            
            <div className="flex flex-col gap-3">
              <p className="font-cactus text-sm font-bold opacity-80">
                {sequencer.lang === 'fr' ? 'Sélectionnez les instruments à inclure :' : 'Selecione os instrumentos para incluir :'}
              </p>
              
              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">

                <label className="flex items-center gap-3 p-2 border-2 border-[var(--cordel-border)] cursor-pointer hover:bg-[var(--cordel-border)]/10 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 cursor-pointer accent-[var(--cordel-wood)]"
                    checked={
                      tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.id !== 'voice').length === selectedExportTracks.size
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = tracks
                          .filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.id !== 'voice')
                          .map(t => t.id);
                        setSelectedExportTracks(new Set(allIds));
                      } else {
                        setSelectedExportTracks(new Set());
                        setSelectedAnnexTracks(new Set());
                      }
                    }}
                  />
                  <span className="font-cactus font-bold text-sm">
                    {sequencer.lang === 'fr' ? 'Tous les instruments' : 'Todos os instrumentos'}
                  </span>
                </label>

                {tracks.map(track => {
                  const conf = instrumentsConfig[track.instrumentIdx];
                  if (!conf || conf.id === 'apito' || conf.id === 'voice') return null;
                  
                  return (
                    <div key={track.id} className="flex flex-col gap-1 p-2 border-2 border-[var(--cordel-border)]/50 ml-4">
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-[var(--cordel-border)]/5 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 cursor-pointer accent-[var(--cordel-text)]"
                          checked={selectedExportTracks.has(track.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedExportTracks);
                            if (e.target.checked) newSet.add(track.id);
                            else {
                              newSet.delete(track.id);
                              const newAnnexSet = new Set(selectedAnnexTracks);
                              newAnnexSet.delete(track.id);
                              setSelectedAnnexTracks(newAnnexSet);
                            }
                            setSelectedExportTracks(newSet);
                          }}
                        />
                        <span className="font-cactus text-xs font-bold">{conf.name}</span>
                      </label>
                      <label className={`flex items-center gap-2 pl-7 cursor-pointer transition-colors ${!selectedExportTracks.has(track.id) ? 'opacity-50 pointer-events-none' : 'hover:bg-[var(--cordel-border)]/5'}`}>
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 cursor-pointer accent-[var(--cordel-text)]"
                          checked={selectedAnnexTracks.has(track.id)}
                          disabled={!selectedExportTracks.has(track.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedAnnexTracks);
                            if (e.target.checked) newSet.add(track.id);
                            else newSet.delete(track.id);
                            setSelectedAnnexTracks(newSet);
                          }}
                        />
                        <span className="font-sans text-[10px] opacity-80">{sequencer.lang === 'fr' ? 'Lexique des variations en annexe' : 'Léxico de variações em anexo'}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => setShowExportMenu(false)}
                className="px-4 py-2 text-sm border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer font-cactus"
              >
                {sequencer.lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => executeExport(false)}
                  disabled={selectedExportTracks.size === 0}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--cordel-wood)] text-[#f4ecd8] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {sequencer.lang === 'fr' ? 'Télécharger (.txt)' : 'Baixar (.txt)'}
                </button>
                <button
                  onClick={() => executeExport(true)}
                  disabled={selectedExportTracks.size === 0}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {sequencer.lang === 'fr' ? 'Imprimer (HTML)' : 'Imprimir (HTML)'}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 pt-3 border-t-2 border-[var(--cordel-border)] border-dashed">
              <button
                onClick={() => { setShowExportMenu(false); printLegendOnly(); }}
                className="w-full px-3 py-2 text-sm bg-[var(--cordel-border)] text-[var(--cordel-bg)] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus text-center"
              >
                {sequencer.lang === 'fr' ? '🖨️ Imprimer la Légende (Feuille séparée)' : '🖨️ Imprimir a Legenda (Folha separada)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {customDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm select-text text-sm">
          <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] p-5 max-w-sm w-full mx-4 flex flex-col gap-4 font-mono select-text">
            <div className="font-cactus font-bold text-base border-b-2 border-[var(--cordel-border)] pb-2 select-none">
              {customDialog.type === 'alert' ? '📢 Info' : customDialog.type === 'confirm' ? '❓' : '📝'} {customDialog.type === 'alert' ? (sequencer.lang === 'pt' ? 'Aviso' : 'Information') : customDialog.type === 'confirm' ? (sequencer.lang === 'pt' ? 'Confirmação' : 'Confirmation') : (sequencer.lang === 'pt' ? 'Entrada' : 'Saisie')}
            </div>
            <p className="text-xs leading-relaxed">{customDialog.message}</p>
            {customDialog.type === 'prompt' && (
              <input
                id="custom-prompt-input"
                type="text"
                autoComplete="off"
                className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-1.5 text-xs outline-none focus:bg-[var(--cordel-text)] focus:text-[var(--cordel-bg)]"
                defaultValue={customDialog.defaultValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    setCustomDialog(null);
                    customDialog.onResolve(val);
                  }
                }}
              />
            )}
            <div className="flex justify-end gap-2.5 mt-2 select-none">
              {customDialog.type !== 'alert' && (
                <button
                  onClick={() => {
                    setCustomDialog(null);
                    customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
                  }}
                  className="px-3 py-1 text-xs border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer"
                >
                  {customDialog.cancelLabel || (sequencer.lang === 'pt' ? 'Cancelar' : 'Annuler')}
                </button>
              )}
              <button
                onClick={() => {
                  const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
                  setCustomDialog(null);
                  if (customDialog.type === 'prompt') {
                    customDialog.onResolve(input?.value || '');
                  } else {
                    customDialog.onResolve(true);
                  }
                }}
                className="px-4 py-1 text-xs bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
              >
                {customDialog.confirmLabel || (sequencer.lang === 'pt' ? 'OK' : 'Valider')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cloud Section Modals */}
      <Suspense fallback={null}>
        {sectionToSave && (
          <SaveSectionModal
            section={sectionToSave}
            onClose={() => setSectionToSave(null)}
          />
        )}
        {loadSectionInsertMeasure !== null && (
          <LoadSectionModal
            insertAtMeasure={loadSectionInsertMeasure}
            onClose={() => setLoadSectionInsertMeasure(null)}
          />
        )}
      </Suspense>

      {viewMode === 'roda' && (!isMobile || mobileTab === 'roda') && <AoVivoOverlay />}

      {/* Toast non-bloquant pour la synchronisation hors ligne */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
      )}
    </>
  );
}
