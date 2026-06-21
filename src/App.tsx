/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import * as Tone from 'tone';
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
import { Home } from './components/Home';
import { LandingPage } from './components/LandingPage';
import { AdminPanel } from './components/AdminPanel';
import { PresetMetadata, Pattern, SongSection, TimeSignature } from './types';
import { exportTablatureFile, printTablature, printLegendOnly } from './utils/exportTablature';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function App() {
  const CURRENT_VERSION = "3.0.1"; // Matches version.json

  // Consume contexts
  const sequencer = useSequencer();
  const audio = useAudio();
  const { hasAccess, userProfile, updateUserPreference } = useAuth();

  // Local Layout / UI States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);
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
  const [presetFiles, setPresetFiles] = useState<string[]>([]);

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

  // Security route protection
  useEffect(() => {
    if (['quiz', 'dictee', 'inspecteur', 'rythmelive'].includes(viewMode) && !hasAccess('eleve')) {
      setViewMode('roda');
    }
    if (viewMode === 'studio' && !hasAccess('mestre')) {
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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
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

        // Try to load autosave from localStorage
        if (!loadedFromHash) {
          try {
            // Support both key variants for backwards compatibility
            const savedStateStr = localStorage.getItem('o_girador_autosave') || localStorage.getItem('o-girador-autosave');
            if (savedStateStr) {
              const savedState = JSON.parse(savedStateStr);
              await audio.applyPreset(savedState);
              restoredFromLocalStorage = true;
              console.log('[O Girador] Autosave restored from localStorage.');
            }
          } catch (err) {
            console.error('[O Girador] Failed to restore autosave from localStorage:', err);
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
  const isInitialMount = useRef(true);
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState<boolean>(false);

  useEffect(() => {
    if (audio.isLoading) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const tracksCopy = sequencer.tracks.map((t: any) => ({
        ...t,
        patterns: t.patterns.map((p: any) => {
          const { vocalAudioData, ...safePattern } = p;
          return safePattern;
        })
      }));

      const dataToSave = {
        bpm: sequencer.bpm,
        timeSig: sequencer.timeSig,
        version: 3,
        totalMeasures: sequencer.totalMeasures,
        tracks: tracksCopy,
        letras: sequencer.letras,
        metadata: sequencer.metadata,
        measureTimeSigs: sequencer.measureTimeSigs,
        measureBpms: sequencer.measureBpms,
        measureBpmTransitions: sequencer.measureBpmTransitions,
        measureVols: sequencer.measureVols,
        measureVolTransitions: sequencer.measureVolTransitions,
        songSections: sequencer.songSections,
        measureSignals: sequencer.measureSignals,
        loopStartMeasure: sequencer.loopStartMeasure,
        loopEndMeasure: sequencer.loopEndMeasure,
        isLoopRegionActive: sequencer.isLoopRegionActive,
        isLooping: sequencer.isLooping,
        masterEQ: audio.masterEQ,
        masterCompressor: audio.masterCompressor,
        masterVol: audio.masterVol,
      };
      try {
        localStorage.setItem('o_girador_autosave', JSON.stringify(dataToSave));
        // Clean up old hyphenated key if it exists (migration)
        localStorage.removeItem('o-girador-autosave');
        setIsSavedIndicatorVisible(true);
      } catch (err) {
        console.error('Failed to autosave state to localStorage:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    sequencer.tracks, sequencer.bpm, sequencer.timeSig, sequencer.totalMeasures, sequencer.letras,
    sequencer.metadata, sequencer.measureTimeSigs, sequencer.measureBpms, sequencer.measureBpmTransitions,
    sequencer.measureVols, sequencer.measureVolTransitions, sequencer.songSections, sequencer.measureSignals,
    sequencer.loopStartMeasure, sequencer.loopEndMeasure, sequencer.isLoopRegionActive, sequencer.isLooping,
    audio.masterEQ, audio.masterCompressor, audio.masterVol, audio.isLoading
  ]);

  useEffect(() => {
    if (isSavedIndicatorVisible) {
      const timer = setTimeout(() => setIsSavedIndicatorVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSavedIndicatorVisible]);

  // Default Instrument selection for keyboard play
  useEffect(() => {
    if (sequencer.tracks.length > 0 && !audio.activeKeyboardInstrumentId) {
      const firstNonVoice = sequencer.tracks.find(t => {
        const conf = instrumentsConfig[t.instrumentIdx];
        return conf && conf.type !== 'voice';
      });
      if (firstNonVoice) {
        audio.setActiveKeyboardInstrumentId(instrumentsConfig[firstNonVoice.instrumentIdx].id);
      } else {
        audio.setActiveKeyboardInstrumentId(instrumentsConfig[sequencer.tracks[0].instrumentIdx].id);
      }
    }
  }, [sequencer.tracks, audio.activeKeyboardInstrumentId]);

  // Touch selector Bubble states
  const [touchSelector, setTouchSelector] = useState<any | null>(null);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);
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
      audio.setCurrentStepIndex(-1);
      audio.setCurrentMeasure(0);
      
      let targetSteps = 16;
      if (selectValue === '3/4' || selectValue === '6/8') targetSteps = 12;
      if (selectValue === '2/4') targetSteps = 8;
      if (selectValue === '12/8') targetSteps = 24;

      const resizedList = sequencer.tracks.map((t) => {
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
      sequencer.setTracks(resizedList);
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
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTouchSelector({
      patternId,
      stepIdx,
      instId,
      x: rect.left + rect.width / 2,
      y: rect.top,
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
  const handleSaveToLocal = () => audio.handleSaveToLocal();
  const handleLoadLocalPreset = (name: string) => audio.handleLoadLocalPreset(name);
  const handleAddTrackInstrument = (instIdx: number) => sequencer.handleAddTrackInstrument(instIdx, audio.currentMeasure);

  const handleExportTablature = () => {
    // By default, select all non-excluded tracks (apito, voice are excluded anyway, but we can check them or just check all)
    const validTrackIds = sequencer.tracks
      .filter(t => {
        const conf = instrumentsConfig[t.instrumentIdx];
        return conf && conf.id !== 'apito' && conf.id !== 'voice';
      })
      .map(t => t.id);
      
    setSelectedExportTracks(new Set(validTrackIds));
    setSelectedAnnexTracks(new Set());
    setShowExportMenu(true);
  };
  
  const executeExport = (wantsPrint: boolean) => {
    setShowExportMenu(false);
    
    // Filter tracks based on selection
    const tracksToExport = sequencer.tracks.filter(t => selectedExportTracks.has(t.id));
    
    if (wantsPrint) {
      printTablature(tracksToExport, selectedAnnexTracks, sequencer.totalMeasures, sequencer.songSections, sequencer.metadata, sequencer.measureTimeSigs, sequencer.measureBpms, sequencer.letras);
    } else {
      exportTablatureFile(tracksToExport, selectedAnnexTracks, sequencer.totalMeasures, sequencer.songSections, sequencer.metadata, sequencer.measureTimeSigs, sequencer.measureBpms, sequencer.letras);
    }
  };

  // Game Engine state definitions
  const [inspecteurCaixaParfaite, setInspecteurCaixaParfaite] = useState<number>(0);
  const [inspecteurCaixaErreur, setInspecteurCaixaErreur] = useState<number>(0);
  const [mestreRhythmState, setMestreRhythmState] = useState<number>(0);

  return (
    <>
      {viewMode === 'landing' ? (
        <LandingPage onEnter={() => setViewMode('home')} lang={sequencer.lang} />
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
          />
        )}

        {viewMode === 'quiz' && (
          <QuizEngine
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
            onSuccess={() => unlockBooklet('folheto_quiz')}
          />
        )}

        {viewMode === 'dictee' && (
          <DicteeEngine
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
            onSuccess={() => unlockBooklet('folheto_dictee')}
          />
        )}

        {viewMode === 'inspecteur' && (
          <InspecteurEngine
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
            caixaParfaite={inspecteurCaixaParfaite}
            caixaErreur={inspecteurCaixaErreur}
            onSuccess={() => unlockBooklet('folheto_inspecteur')}
          />
        )}

        {viewMode === 'mestre' && (
          <MestreEngine
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
            rhythmState={mestreRhythmState}
            setRhythmState={setMestreRhythmState}
            onSuccess={() => unlockBooklet('folheto_mestre')}
          />
        )}

        {viewMode === 'rythmelive' && (
          <RythmeLiveEngine
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
            onSuccess={() => unlockBooklet('folheto_rythmelive')}
          />
        )}

        {viewMode === 'varal' && (
          <VaralCordel
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
            unlockedFolhetos={unlockedFolhetos}
            justUnlockedBookletId={justUnlockedBookletId}
            onClearJustUnlocked={() => setJustUnlockedBookletId(null)}
          />
        )}

        {viewMode === 'studio' && (
          <Suspense fallback={<div className="flex-1 flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
            <MestreStudio
              lang={sequencer.lang}
              onExit={() => setViewMode('roda')}
            />
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
          />
        )}
      </div>

      {/* Mobile view Tab Bar */}
      {isMobile && viewMode === 'roda' && (
        <div className="flex w-full bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] h-12 shrink-0 z-40 text-[var(--cordel-text)]">
          <button
            onClick={() => setMobileTab('roda')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center border-r border-[var(--cordel-border)] cursor-pointer ${
              mobileTab === 'roda' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
          >
            <span className="text-sm">⭕</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold">Roda</span>
          </button>
          <button
            onClick={() => setMobileTab('mixer')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center border-r border-[var(--cordel-border)] cursor-pointer ${
              mobileTab === 'mixer' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
          >
            <span className="text-sm">🎛️</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold">{sequencer.lang === 'pt' ? 'Mixador' : 'Mixeur'}</span>
          </button>
          <button
            onClick={() => setMobileTab('toada')}
            className={`flex-1 font-cactus font-bold text-xs flex flex-col items-center justify-center cursor-pointer ${
              mobileTab === 'toada' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
          >
            <span className="text-sm">📝</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold font-cactus">Toada</span>
          </button>
        </div>
      )}

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
                      sequencer.tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.id !== 'voice').length === selectedExportTracks.size
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = sequencer.tracks
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

                {sequencer.tracks.map(track => {
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
      {viewMode === 'roda' && (!isMobile || mobileTab === 'roda') && <AoVivoOverlay />}
    </div>
      )}
    </>
  );
}
