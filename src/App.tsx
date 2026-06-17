/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { useSequencer } from './contexts/SequencerContext';
import { useAudio } from './contexts/AudioContext';
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
import { ConsoleMixer } from './components/ConsoleMixer';
import { CircleSequencer } from './components/CircleSequencer';
import { RightSidebar } from './components/RightSidebar';
import { TimelineSequencer } from './components/TimelineSequencer';
import { TouchStrokeSelector } from './components/TouchStrokeSelector';
import { QuizEngine } from './components/QuizEngine';
import { DicteeEngine } from './components/DicteeEngine';
import { InspecteurEngine } from './components/InspecteurEngine';
import { MestreEngine } from './components/MestreEngine';
import { RythmeLiveEngine } from './components/RythmeLiveEngine';
import { VaralCordel } from './components/VaralCordel';
import { MestreStudio } from './components/MestreStudio';
import { PresetMetadata, Pattern, SongSection, TimeSignature } from './types';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function App() {
  const CURRENT_VERSION = "2.2"; // Matches version.json

  // Consume contexts
  const sequencer = useSequencer();
  const audio = useAudio();

  // Local Layout / UI States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | null>(
    window.innerWidth < 1024 ? 'letras' : 'letras'
  );
  const [viewMode, setViewMode] = useState<'roda' | 'console' | 'timeline' | 'quiz' | 'dictee' | 'inspecteur' | 'mestre' | 'rythmelive' | 'varal' | 'studio'>('roda');
  const [unlockedFolhetos, setUnlockedFolhetos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('baquemix-unlocked-folhetos');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [justUnlockedBookletId, setJustUnlockedBookletId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('baquemix-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaDark.matches) return true;
    return true; // default to true
  });
  const [localPresets, setLocalPresets] = useState<string[]>([]);
  const [presetFiles, setPresetFiles] = useState<string[]>([]);

  // Dialog System
  const [customDialog, setCustomDialog] = useState<{
    type: 'alert' | 'confirm' | 'prompt';
    message: string;
    defaultValue?: string;
    onResolve: (value: any) => void;
  } | null>(null);

  const alertAsync = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'alert', message, onResolve: resolve });
    });
  };

  const confirmAsync = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'confirm', message, onResolve: resolve });
    });
  };

  const promptAsync = (message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setCustomDialog({ type: 'prompt', message, defaultValue, onResolve: resolve });
    });
  };

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
        ? "Une nouvelle version de BaqueMix est disponible. Recharger pour mettre à jour ?"
        : "Uma nova versão do BaqueMix está disponível. Recarregar para atualizar ?"
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
            await caches.delete(key);
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
                    ? "Une nouvelle version de BaqueMix est disponible. Recharger pour mettre à jour ?"
                    : "Uma nova versão do BaqueMix está disponível. Recarregar para atualizar ?"
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
                        await caches.delete(key);
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
    if (window.innerWidth <= 1000) {
      setIsLeftPanelCollapsed(true);
    }
  }, []);

  // Sync theme
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('baquemix-theme', theme);
  }, [isDarkMode]);

  // Local folhetos persistence
  useEffect(() => {
    localStorage.setItem('baquemix-unlocked-folhetos', JSON.stringify(unlockedFolhetos));
  }, [unlockedFolhetos]);

  const unlockBooklet = (id: string) => {
    setUnlockedFolhetos((prev) => {
      if (prev.includes(id)) return prev;
      setJustUnlockedBookletId(id);
      setViewMode('varal');
      return [...prev, id];
    });
  };

  // Fetch presets catalog & library
  useEffect(() => {
    fetch(`${ASSETS_BASE_URL}presets/catalog.json`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPresetFiles(data.map((item: any) => item.file));
        }
      })
      .catch(err => console.error("Failed to load presets catalog:", err));
  }, []);

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
  }, [sequencer.tracks]);

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

      if (
        e.code === 'Space' &&
        activeTag !== 'INPUT' &&
        activeTag !== 'SELECT' &&
        activeId !== 'letras-textarea'
      ) {
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
      const tracksCopy = JSON.parse(JSON.stringify(sequencer.tracks));
      tracksCopy.forEach((t: any) => t.patterns?.forEach((p: any) => { delete p.vocalAudioData; }));

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
        masterEQ: audio.masterEQ,
        masterCompressor: audio.masterCompressor,
        masterVol: audio.masterVol,
      };
      try {
        localStorage.setItem('baquemix_autosave', JSON.stringify(dataToSave));
        setIsSavedIndicatorVisible(true);
      } catch (err) {
        console.error('Failed to autosave state to localStorage:', err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    sequencer.tracks, sequencer.bpm, sequencer.timeSig, sequencer.totalMeasures, sequencer.letras,
    sequencer.metadata, sequencer.measureTimeSigs, sequencer.measureBpms, sequencer.measureBpmTransitions,
    sequencer.measureVols, sequencer.measureVolTransitions, sequencer.songSections, sequencer.measureSignals,
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

  const handleTrackMoveUp = (id: number) => sequencer.handleTrackMoveUp(id);
  const handleTrackMoveDown = (id: number) => sequencer.handleTrackMoveDown(id);
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
  const handlePastePattern = (tId: number) => sequencer.handlePastePattern(tId);
  const handleCreateSongSection = (name: string, start: number, end: number, color?: string) => sequencer.handleCreateSongSection(name, start, end, color);
  const handleUpdateSongSection = (id: string, name: string, start: number, end: number, color?: string) => sequencer.handleUpdateSongSection(id, name, start, end, color);
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

  // Game Engine state definitions
  const [inspecteurCaixaParfaite, setInspecteurCaixaParfaite] = useState<number>(0);
  const [inspecteurCaixaErreur, setInspecteurCaixaErreur] = useState<number>(0);
  const [mestreRhythmState, setMestreRhythmState] = useState<number>(0);

  return (
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
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        presetFiles={presetFiles}
        localPresets={localPresets}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        onToggleLeftPanel={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        viewMode={viewMode}
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
                isLeftPanelCollapsed={isMobile ? false : isLeftPanelCollapsed}
                onToggleLeftPanel={() => setIsLeftPanelCollapsed(true)}
                onStepTouchStart={handleStepTouchStart}
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
          <MestreStudio
            lang={sequencer.lang}
            onExit={() => setViewMode('roda')}
          />
        )}

        {/* Right drawer sidebar context panel */}
        {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && (!isMobile || (viewMode === 'roda' && mobileTab === 'toada')) && (
          <RightSidebar
            activePanel={isMobile ? (activeRightPanel || 'letras') : activeRightPanel}
            onTogglePanel={(p) => {
              if (isMobile) {
                setActiveRightPanel(activeRightPanel === 'letras' ? 'legend' : 'letras');
              } else {
                setActiveRightPanel(activeRightPanel === p ? null : p);
              }
            }}
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

      {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && (
        <TransportBar
          viewMode={viewMode as any}
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
                  {sequencer.lang === 'pt' ? 'Cancelar' : 'Annuler'}
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
                {sequencer.lang === 'pt' ? 'OK' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
