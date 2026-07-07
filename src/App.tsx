/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useGameData } from './contexts/GameDataContext';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from './contexts/SequencerContext';
import { useAudio } from './contexts/AudioContext';
import { useAuth } from './contexts/AuthContext';
import { i18n, instrumentsConfig } from './data';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { Mixer } from './components/Mixer';
import { RightSidebar } from './components/RightSidebar';
import { useSequencerStore } from './stores/useSequencerStore';
import { TouchStrokeSelector } from './components/TouchStrokeSelector';
import { ExportMenuModal } from './components/ExportMenuModal';
import { ErrorBoundary } from './components/ErrorBoundary';

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
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));

import { Pattern, SongSection, TimeSignature, CloudRhythmSignal } from './types';
import { exportTablatureFile, printTablature, printLegendOnly } from './utils/exportTablature';
import { fetchMestreSignals } from './cloudSignals';
import { useQueryClient } from '@tanstack/react-query';
import { useCloudPresets } from './hooks/queries/useCloudPresets';

// Import our new extracted custom hooks
import { useAppUpdate, CURRENT_VERSION } from './hooks/useAppUpdate';
import { useAppAudio } from './hooks/useAppAudio';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';

export default function App() {
  // 1. Core hook extraction setup
  const { deferredPrompt, handleInstallClick } = useAppUpdate();
  const { presetFiles, localPresets, isSavedIndicatorVisible, refreshLocalPresets } = useAppAudio();
  useGlobalKeyboardShortcuts();

  const isEcoMode = useSequencerStore(state => state.isEcoMode);
  useEffect(() => {
    document.body.classList.toggle('eco-mode', isEcoMode);
  }, [isEcoMode]);

  // Consume contexts
  const sequencer = useSequencer();
  const audio = useAudio();
  const { hasAccess, userProfile, updateUserPreference } = useAuth();
  const { completeExercise } = useGameData();
  const [activeVaralExercise, setActiveVaralExercise] = useState<any>(null);

  const renderFallback = (componentNameFr: string, componentNamePt: string) => (reset: () => void) => {
    const isPt = sequencer.lang === 'pt';
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded text-red-400 font-cactus text-sm m-2">
        {isPt 
          ? `Ocorreu um erro no componente ${componentNamePt}.` 
          : `Une erreur est survenue dans le composant ${componentNameFr}.`}
        <button 
          className="block mt-2 underline cursor-pointer hover:text-red-300 transition-colors"
          onClick={reset}
        >
          {isPt ? 'Tentar novamente' : 'Réessayer'}
        </button>
      </div>
    );
  };

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
  const [hasVisitedStudio, setHasVisitedStudio] = useState(false);

  useEffect(() => {
    if (viewMode === 'studio') {
      setHasVisitedStudio(true);
    }
  }, [viewMode]);

  const changeViewMode = React.useCallback((targetView: typeof viewMode) => {
    const isHeavyView = ['studio', 'quiz', 'dictee', 'inspecteur', 'mestre', 'rythmelive', 'admin'].includes(targetView);

    const applyViewChange = () => {
      setViewMode(targetView);
      if (targetView === 'console' || targetView === 'timeline') {
        setActiveRightPanel(null);
      } else if (targetView === 'roda') {
        if (window.innerWidth >= 1024) {
          setActiveRightPanel('letras');
        }
      }
    };

    if (isHeavyView && audio.isPlaying) {
      audio.handleStop();
      requestAnimationFrame(() => {
        applyViewChange();
      });
    } else {
      applyViewChange();
    }
  }, [audio.isPlaying, audio.handleStop]);

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Dynamically update document title based on language, keeping "O Girador" untranslated
  useEffect(() => {
    document.title = sequencer.lang === 'fr'
      ? 'O Girador | Séquenceur dédié au Maracatu de Baque Virado'
      : 'O Girador | Sequenciador dedicado ao Maracatu de Baque Virado';
  }, [sequencer.lang]);

  // Security access gate controls: redirect to Roda if roles change and active view requires admin privileges
  useEffect(() => {
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
      changeViewMode('varal');
      return [...prev, id];
    });
  };

  const handleGameSuccess = (moduleName: string) => {
    const normalizedName = moduleName === 'rythme_live' ? 'rythmelive' : (moduleName === 'sablier_mestre' ? 'mestre' : moduleName);
    unlockBooklet(`folheto_${normalizedName}`);
    if (activeVaralExercise) {
      completeExercise(activeVaralExercise.id);
      changeViewMode('varal');
      setActiveVaralExercise(null);
    }
  };

  const handleGameExit = () => {
    if (activeVaralExercise) {
      changeViewMode('varal');
      setActiveVaralExercise(null);
    } else {
      changeViewMode('roda');
    }
  };

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
              isPt ? 'Digite o UID de um visitante/Mestre alvo (ou deixe vazio pour você mesmo):' : 'Entrez l\'UID du visiteur privilégié ou du Mestre (laissez vide pour vous-même) :'
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
        <Suspense fallback={<div className="min-h-screen bg-[var(--cordel-bg)] flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
          <LandingPage onEnter={() => changeViewMode('roda')} lang={sequencer.lang} />
        </Suspense>
      ) : viewMode === 'home' ? (
        <Home onEnter={(mode) => changeViewMode(mode as any)} lang={sequencer.lang} />
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
        onAdminClick={() => changeViewMode('admin')}
        presetFiles={presetFiles}
        localPresets={localPresets}
        cloudPresets={cloudPresets}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={(p) => setActiveRightPanel(activeRightPanel === p ? null : p)}
        viewMode={viewMode as any}
        onViewModeToggle={changeViewMode}
        isMobile={isMobile}
        mobileTab={mobileTab}
        onMobileTabToggle={setMobileTab}
        version={CURRENT_VERSION}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <div id="main-workspace" className="flex flex-grow min-h-0 overflow-hidden relative w-full mobile-stack cordel-bg">
        {/* RODA VIEW */}
        <div style={{ display: viewMode === 'roda' ? 'contents' : 'none' }}>
          {/* Left column tracks mixers */}
          <div style={{ display: (!isMobile || mobileTab === 'mixer') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Mixeur', 'Mixador')}>
              <Mixer
                onStepTouchStart={handleStepTouchStart}
                onCopyPattern={handleCopyPattern}
                onPastePattern={handlePastePattern}
                onLoadLibraryPattern={handleLoadLibraryPattern}
                canPaste={!!sequencer.copiedPattern}
                isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'mixer')}
              />
            </ErrorBoundary>
          </div>

          {/* Center circle visual canvas engine */}
          <div style={{ display: (!isMobile || mobileTab === 'roda') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Séquenceur Circulaire', 'Sequenciador Circular')}>
              <Suspense fallback={null}>
                <CircleSequencer
                  isMobile={isMobile}
                  mestreSignals={filteredMestreSignals}
                  onStepTouchStart={handleStepTouchStart}
                  isActive={viewMode === 'roda' && (!isMobile || mobileTab === 'roda')}
                />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Right drawer sidebar context panel */}
          <div style={{ display: (!isMobile || mobileTab === 'toada') ? 'contents' : 'none' }}>
            <ErrorBoundary fallback={renderFallback('Panneau Latéral', 'Painel Lateral')}>
              <RightSidebar
                activePanel={isMobile ? (activeRightPanel || 'letras') : 'info'}
                onTogglePanel={(p) => {
                  if (isMobile) {
                    setActiveRightPanel(activeRightPanel === 'letras' ? 'legend' : 'letras');
                  }
                }}
                isMobile={isMobile}
                mestreSignals={filteredMestreSignals}
                refreshMestreSignals={refreshMestreSignals}
                hideGlobalSignals={hideGlobalSignals}
                onToggleHideGlobalSignals={() => setHideGlobalSignals(!hideGlobalSignals)}
                visible={viewMode === 'roda' && (!isMobile || mobileTab === 'toada')}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* MIXER CONSOLE VIEW */}
        <div 
          className="flex-1 min-w-0 flex flex-col h-full overflow-x-auto overflow-y-hidden custom-scrollbar"
          style={{ display: viewMode === 'console' ? 'flex' : 'none' }}
        >
          <ErrorBoundary fallback={renderFallback('Mixeur Console', 'Mesa de Som')}>
            <Suspense fallback={null}>
              <ConsoleMixer
                isMobile={isMobile}
                onStepTouchStart={handleStepTouchStart}
                isActive={viewMode === 'console'}
              />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* TIMELINE VIEW */}
        <div style={{ display: viewMode === 'timeline' ? 'flex' : 'none', flex: 1, minWidth: 0, flexDirection: 'column', height: '100%' }}>
          <ErrorBoundary fallback={renderFallback('Linha do Tempo / Timeline', 'Linha do Tempo')}>
            <Suspense fallback={null}>
              <TimelineSequencer
                isMobile={isMobile}
                measureWidth={measureWidth}
                onMeasureWidthChange={setMeasureWidth}
                onExportTablature={handleExportTablature}
                onSaveCloudSection={setSectionToSave}
                onLoadCloudSection={setLoadSectionInsertMeasure}
                mestreSignals={filteredMestreSignals}
                isActive={viewMode === 'timeline'}
              />
            </Suspense>
          </ErrorBoundary>
        </div>

        {viewMode === 'quiz' && (
          <ErrorBoundary fallback={renderFallback('Quiz', 'Questionário')}>
            <QuizEngine
              lang={sequencer.lang}
              onExit={handleGameExit}
              onSuccess={() => handleGameSuccess('quiz')}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'dictee' && (
          <ErrorBoundary fallback={renderFallback('Dictée Rythmique', 'Ditado Rítmico')}>
            <DicteeEngine
              lang={sequencer.lang}
              onExit={handleGameExit}
              onSuccess={() => handleGameSuccess('dictee')}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'inspecteur' && (
          <ErrorBoundary fallback={renderFallback('Inspecteur', 'Inspetor')}>
            <Suspense fallback={<div>Chargement...</div>}>
              <InspecteurEngine
                lang={sequencer.lang}
                onExit={handleGameExit}
                exerciseData={activeVaralExercise}
                onSuccess={() => handleGameSuccess('inspecteur')}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {viewMode === 'mestre' && (
          <ErrorBoundary fallback={renderFallback('Mestre', 'Mestre')}>
            <MestreEngine
              lang={sequencer.lang}
              onExit={handleGameExit}
              rhythmState={mestreRhythmState}
              setRhythmState={setMestreRhythmState}
              onSuccess={() => handleGameSuccess('sablier_mestre')}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'rythmelive' && (
          <ErrorBoundary fallback={renderFallback('Rythme Live', 'Ritmo Live')}>
            <RythmeLiveEngine
              lang={sequencer.lang}
              onExit={handleGameExit}
              onSuccess={() => handleGameSuccess('rythme_live')}
              exerciseData={activeVaralExercise}
            />
          </ErrorBoundary>
        )}

        {viewMode === 'varal' && (
          <ErrorBoundary fallback={renderFallback('Varal de Cordel', 'Varal de Cordel')}>
            <Suspense fallback={<div>Chargement...</div>}>
              <VaralCordel
                lang={sequencer.lang}
                onExit={() => changeViewMode('roda')}
                unlockedFolhetos={unlockedFolhetos}
                justUnlockedBookletId={justUnlockedBookletId}
                onClearJustUnlocked={() => setJustUnlockedBookletId(null)}
                onLaunchExercise={(ex, cordeIndex) => {
                  setActiveVaralExercise(ex);
                  setActiveCordeIndex(cordeIndex);
                  if (ex.module === 'quiz') changeViewMode('quiz');
                  else if (ex.module === 'dictee') changeViewMode('dictee');
                  else if (ex.module === 'inspecteur') changeViewMode('inspecteur');
                  else if (ex.module === 'rythme_live') changeViewMode('rythmelive');
                  else if (ex.module === 'sablier_mestre') changeViewMode('mestre');
                }}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {hasVisitedStudio && (
          <div 
            className="flex-1 w-full h-full overflow-hidden flex flex-col relative z-20"
            style={{ display: viewMode === 'studio' ? 'flex' : 'none' }}
          >
            <ErrorBoundary fallback={renderFallback('Studio Mestre', 'Estúdio Mestre')}>
              <Suspense fallback={<div className="flex-1 flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
                <MestreStudio
                  isActive={viewMode === 'studio'}
                  lang={sequencer.lang}
                  onExit={() => changeViewMode('roda')}
                  presetFiles={presetFiles}
                  localPresets={localPresets}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {viewMode === 'admin' && (
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
            <ErrorBoundary fallback={renderFallback('Panneau Admin', 'Painel de Administração')}>
              <Suspense fallback={<div className="flex-1 flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
                <AdminPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </div>

      {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && viewMode !== 'admin' && (
        <TransportBar
          viewMode={viewMode as any}
          onViewModeToggle={changeViewMode}
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
        <ExportMenuModal
          onClose={() => setShowExportMenu(false)}
          selectedExportTracks={selectedExportTracks}
          setSelectedExportTracks={setSelectedExportTracks}
          selectedAnnexTracks={selectedAnnexTracks}
          setSelectedAnnexTracks={setSelectedAnnexTracks}
          executeExport={executeExport}
          printLegendOnly={printLegendOnly}
          lang={sequencer.lang}
        />
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

      {viewMode === 'roda' && (!isMobile || mobileTab === 'roda') && (
        <ErrorBoundary fallback={null}>
          <AoVivoOverlay />
        </ErrorBoundary>
      )}

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
