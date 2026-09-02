/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense, useTransition } from 'react';

import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from './contexts/SequencerContext';
import { useAudio } from './contexts/AudioContext';
import { useAuth, checkIsAdmin } from './contexts/AuthContext';
import { i18n, instrumentsConfig } from './data';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { useSequencerStore } from './stores/useSequencerStore';
import { useSequencerSettingsStore } from './stores/useSequencerSettingsStore';
import { useTransportStore } from './stores/useTransportStore';
import { SettingsPage } from './components/SettingsPage';
import { TouchStrokeSelector } from './components/TouchStrokeSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainWorkspaceLayout } from './components/MainWorkspaceLayout';
import { GlobalModalsLayout } from './components/GlobalModalsLayout';
import { AudioCompilerProvider } from './contexts/AudioCompilerContext';
import { CustomPromptModal } from './components/CustomPromptModal';
import { SavePresetModal } from './components/SavePresetModal';
import { useWizardStore } from './stores/useWizardStore';
import { NewSongIntroModal } from './components/NewSongIntroModal';
import { WizardOverlay } from './components/WizardOverlay';
import { SEO } from './components/SEO';

import { Home } from './components/Home';
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));

import { Pattern, SongSection, TimeSignature, CloudRhythmSignal } from './types';
import { exportTablatureFile, printTablature, printLegendOnly } from './utils/exportTablature';
import { fetchMestreSignals } from './cloudSignals';
import { useQueryClient } from '@tanstack/react-query';
import { useCloudPresets } from './hooks/queries/useCloudPresets';

// Import our new extracted custom hooks
import { useAppUpdate, CURRENT_VERSION } from './hooks/useAppUpdate';
import { useAppAudio } from './hooks/useAppAudio';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { useViewRouter } from './hooks/useViewRouter';
import { useThemeManager } from './hooks/useThemeManager';
import { useMidiController } from './hooks/useMidiController';
import { startSession, endSession } from './utils/O-Girador-Tracker';
import { VisitorAuthModal } from './components/VisitorAuthModal';

export default function App() {
  // 1. Core hook extraction setup
  const { deferredPrompt, handleInstallClick } = useAppUpdate();
  const { presetFiles, localPresets, isSavedIndicatorVisible, refreshLocalPresets } = useAppAudio();
  useGlobalKeyboardShortcuts();
  useMidiController();

  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);

  const isIntroModalOpen = useWizardStore((state) => state.isIntroModalOpen);
  const isWizardOpen = useWizardStore((state) => state.isWizardOpen);
  const setIntroModalOpen = useWizardStore((state) => state.setIntroModalOpen);
  const setWizardOpen = useWizardStore((state) => state.setWizardOpen);

  // Consume contexts
  const sequencer = useSequencer();
  const {
    customDialog,
    setCustomDialog,
    alertAsync,
    confirmAsync,
    promptAsync,
  } = sequencer;
  const audio = useAudio();
  const { hasAccess, userProfile, updateUserPreference, isAdmin } = useAuth();

  React.useEffect(() => {
    const isFree = !userProfile || (!isAdmin && userProfile.role !== 'mestre');
    useSequencerStore.getState().setMaxMeasuresAllowed(isFree ? 30 : null);
    
    // Mode aperçu pour les visiteurs avec un lien partagé
    const urlParams = new URLSearchParams(window.location.search);
    const hasPreset = !!urlParams.get('loadPreset');
    const isPreview = hasPreset && !userProfile;
    useSequencerStore.getState().setIsPreviewMode(isPreview);
  }, [userProfile]);

  const [showMandatoryVisitorModal, setShowMandatoryVisitorModal] = useState(false);

  React.useEffect(() => {
    const handleShowAuth = () => {
      setShowMandatoryVisitorModal(true);
    };
    window.addEventListener('show-visitor-auth-mandatory', handleShowAuth);
    return () => window.removeEventListener('show-visitor-auth-mandatory', handleShowAuth);
  }, []);

  // Context and unstable state Refs to maximize callback stabilization
  const sequencerRef = React.useRef(sequencer);
  const audioRef = React.useRef(audio);
  const userProfileRef = React.useRef(userProfile);
  const updateUserPreferenceRef = React.useRef(updateUserPreference);
  const contextHasAccessRef = React.useRef(hasAccess);


  const alertAsyncRef = React.useRef(alertAsync);
  const confirmAsyncRef = React.useRef(confirmAsync);
  const promptAsyncRef = React.useRef(promptAsync);
  const setCustomDialogRef = React.useRef(setCustomDialog);

  React.useEffect(() => { sequencerRef.current = sequencer; }, [sequencer]);
  React.useEffect(() => { audioRef.current = audio; }, [audio]);
  React.useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);
  React.useEffect(() => { updateUserPreferenceRef.current = updateUserPreference; }, [updateUserPreference]);
  React.useEffect(() => { contextHasAccessRef.current = hasAccess; }, [hasAccess]);


  React.useEffect(() => { alertAsyncRef.current = alertAsync; }, [alertAsync]);
  React.useEffect(() => { confirmAsyncRef.current = confirmAsync; }, [confirmAsync]);
  React.useEffect(() => { promptAsyncRef.current = promptAsync; }, [promptAsync]);
  React.useEffect(() => { setCustomDialogRef.current = setCustomDialog; }, [setCustomDialog]);

  // Session Tracking
  React.useEffect(() => {
    const appId = 'o-girador-sequenceur';

    if (userProfile) {
      startSession(userProfile, appId);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession(appId, undefined, userProfile?.uid);
      } else if (document.visibilityState === 'visible' && userProfile) {
        startSession(userProfile, appId);
      }
    };

    const handleBeforeUnload = () => {
      endSession(appId, undefined, userProfile?.uid);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession(appId, undefined, userProfile?.uid);
    };
  }, [userProfile]);


  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [selectedExportTracks, setSelectedExportTracks] = useState<Set<number>>(new Set());
  const [selectedAnnexTracks, setSelectedAnnexTracks] = useState<Set<number>>(new Set());
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null>(
    'info'
  );

  // Instantiation of the new hooks
  const router = useViewRouter({
    audio,
    setActiveRightPanel: (panel) => setActiveRightPanel(panel),
  });

  const theme = useThemeManager({
    lang: sequencer.lang,
  });

  // Extract View and Theme states/actions
  const {
    viewMode,
    renderedView,
    isFadingIn,
    hasVisitedStudio,
    changeViewMode
  } = router;

  const {
    isDarkMode,
    toggleDarkMode
  } = theme;

  const [unlockedFolhetos, setUnlockedFolhetos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('o-girador-unlocked-folhetos');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [justUnlockedBookletId, setJustUnlockedBookletId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const editingTrackId = useSequencerStore(state => state.editingTrackId);
  const setEditingTrackId = useSequencerStore(state => state.setEditingTrackId);
  const isDetailView = editingTrackId !== null;
  const [isDetailViewDeferred, setIsDetailViewDeferred] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isDetailView) {
      setIsDetailViewDeferred(true);
    } else {
      const id = setTimeout(() => {
        setIsDetailViewDeferred(false);
      }, 50);
      return () => clearTimeout(id);
    }
  }, [isDetailView]);

  const handleSetEditingTrackId = React.useCallback((id: number | null) => {
    startTransition(() => {
      setEditingTrackId(id);
    });
  }, [setEditingTrackId]);

  const queryClient = useQueryClient();
  const { data: cloudPresetsData } = useCloudPresets({
    userUid: userProfile?.uid || null,
    userRole: userProfile?.role || 'visiteur',
    mestreId: userProfile?.mestreId || null,
    groupId: userProfile?.groupId || null
  });

  const cloudPresets = useMemo(() => {
    return (cloudPresetsData || []).map(p => ({ id: p.id, name: p.name }));
  }, [cloudPresetsData]);


  // All title sync, security gate redirections, and dark mode toggles are now handled by hooks

  const [mestreSignals, setMestreSignals] = useState<CloudRhythmSignal[]>([]);
  const [hideGlobalSignals, setHideGlobalSignals] = useState(false);

  const filteredMestreSignals = useMemo(() => {
    if (!hideGlobalSignals) return mestreSignals;
    return mestreSignals.filter(s => s.mestreId !== 'global');
  }, [mestreSignals, hideGlobalSignals]);

  const refreshMestreSignals = React.useCallback(async () => {
    const profile = userProfileRef.current;
    const actualRole1 = profile?.dbRole || profile?.role;
    const isMestreAdmin = actualRole1 === 'mestre' || actualRole1 === 'admin';
    const isEleve = contextHasAccessRef.current ? contextHasAccessRef.current('eleve') : false;
    
    let targetMestreId = null;
    if (isMestreAdmin) {
      targetMestreId = profile?.mestreId || profile?.uid;
    } else if (isEleve) {
      targetMestreId = profile?.mestreId;
    }

    if (targetMestreId) {
      const { signals } = await fetchMestreSignals(targetMestreId);
      setMestreSignals(signals);
      useSequencerStore.getState().setMestreSignals(signals);
    } else {
      // Even if no mestre ID, we can fetch 'global' signals
      const { signals } = await fetchMestreSignals('global');
      setMestreSignals(signals);
      useSequencerStore.getState().setMestreSignals(signals);
    }
  }, []);

  useEffect(() => {
    refreshMestreSignals();
  }, [userProfile?.uid, userProfile?.mestreId, userProfile?.role, refreshMestreSignals]);

  // Charger le balanço personnalisé du Mestre connecté depuis Firebase
  useEffect(() => {
    if (userProfile && (userProfile as any).customSwingOffsets) {
      const savedOffsets = (userProfile as any).customSwingOffsets;
      const savedIntensity = (userProfile as any).customSwingIntensity !== undefined ? (userProfile as any).customSwingIntensity : 100;
      const currentSwing = useTransportStore.getState().globalSwing;
      useTransportStore.getState().setGlobalSwing({
        ...currentSwing,
        customOffsets: savedOffsets,
        swingIntensity: savedIntensity
      });
    }
  }, [userProfile?.uid]);

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

  // Theme application and synchronization is now handled by useThemeManager

  // Local folhetos persistence
  useEffect(() => {
    localStorage.setItem('o-girador-unlocked-folhetos', JSON.stringify(unlockedFolhetos));
  }, [unlockedFolhetos]);

  const unlockBooklet = React.useCallback((id: string) => {
    setUnlockedFolhetos((prev) => {
      if (prev.includes(id)) return prev;
      setJustUnlockedBookletId(id);
      changeViewMode('varal');
      return [...prev, id];
    });
  }, [changeViewMode]);



  // Touch selector Bubble states
  const [touchSelector, setTouchSelector] = useState<any | null>(null);
  const [hoveredStroke, setHoveredStroke] = useState<string | null>(null);

  // Progression State
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [activeCordeIndex, setActiveCordeIndex] = useState<number | null>(null);

  // Cloud Section State
  const [sectionToSave, setSectionToSave] = useState<SongSection | null>(null);
  const [loadSectionInsertMeasure, setLoadSectionInsertMeasure] = useState<number | null>(null);
  const [measureWidth, setMeasureWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 240;
    const w = window.innerWidth;
    if (w < 600) {
      return Math.max(120, Math.min(150, Math.round((w - 100) / 2.5)));
    } else if (w < 1024) {
      return Math.max(140, Math.min(200, Math.round((w - 160) / 4.5)));
    } else {
      return Math.max(160, Math.min(280, Math.round((w - 260) / 6.5)));
    }
  });
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

  const handleTrackInstrumentIdxChange = React.useCallback((id: number, targetInstIdx: number) => sequencerRef.current.handleTrackInstrumentIdxChange(id, targetInstIdx), []);
  const handleTrackMuteToggle = React.useCallback((id: number) => sequencerRef.current.handleTrackMuteToggle(id), []);
  const handleTrackSoloToggle = React.useCallback((id: number) => sequencerRef.current.handleTrackSoloToggle(id), []);
  const handleTrackHideToggle = React.useCallback((id: number) => sequencerRef.current.handleTrackHideToggle(id), []);
  const handleTrackDelete = React.useCallback((id: number) => sequencerRef.current.handleTrackDelete(id), []);
  const handleTrackVolumeChange = React.useCallback((id: number, val: number) => sequencerRef.current.handleTrackVolumeChange(id, val), []);
  const handleTrackReverbChange = React.useCallback((id: number, val: number) => sequencerRef.current.handleTrackReverbChange(id, val), []);
  const handleTrackStepVolumeChange = React.useCallback((tId: number, pId: number, sIdx: number | number[], val: number) => sequencerRef.current.handleTrackStepVolumeChange(tId, pId, sIdx, val), []);
  const handleTrackStepDecayChange = React.useCallback((tId: number, pId: number, sIdx: number | number[], val: number) => sequencerRef.current.handleTrackStepDecayChange(tId, pId, sIdx, val), []);
  const handleTrackStepMicrotimingChange = React.useCallback((tId: number, pId: number, sIdx: number | number[], val: number) => sequencerRef.current.handleTrackStepMicrotimingChange(tId, pId, sIdx, val), []);
  const handleResetTrackMicrotimings = React.useCallback((tId: number, pId: number) => sequencerRef.current.handleResetTrackMicrotimings(tId, pId), []);
  const handleTrackPanChange = React.useCallback((id: number, val: number) => sequencerRef.current.handleTrackPanChange(id, val), []);
  const handleTrackStepsChange = React.useCallback((tId: number, pId: number, s: number) => sequencerRef.current.handleTrackStepsChange(tId, pId, s), []);
  const handleTimelinePatternAssign = React.useCallback((tId: number, pId: number | null, mIdx: number) => sequencerRef.current.handleTimelinePatternAssign(tId, pId, mIdx), []);
  const handleMeasureTimeSigChange = React.useCallback((mIdx: number, val: TimeSignature) => sequencerRef.current.handleMeasureTimeSigChange(mIdx, val), []);
  const handleMeasureBpmChange = React.useCallback((mIdx: number, val: number) => sequencerRef.current.handleMeasureBpmChange(mIdx, val), []);
  const handleMeasureTransitionChange = React.useCallback((mIdx: number, val: 'immediate' | 'ramp') => sequencerRef.current.handleMeasureTransitionChange(mIdx, val), []);
  const handleMeasureVolChange = React.useCallback((mIdx: number, val: number) => sequencerRef.current.handleMeasureVolChange(mIdx, val), []);
  const handleMeasureVolTransitionChange = React.useCallback((mIdx: number, val: 'immediate' | 'ramp') => sequencerRef.current.handleMeasureVolTransitionChange(mIdx, val), []);
  const handleTotalMeasuresChange = React.useCallback((val: number) => sequencerRef.current.handleTotalMeasuresChange(val), []);
  const handleDeleteMeasure = React.useCallback((mIdx: number) => sequencerRef.current.handleDeleteMeasure(mIdx), []);
  const handleInsertMeasure = React.useCallback((mIdx: number, amount: number = 1) => sequencerRef.current.handleInsertMeasure(mIdx, amount), []);
  const handleSetLoopStart = React.useCallback((mIdx: number) => sequencerRef.current.handleSetLoopStart(mIdx), []);
  const handleSetLoopEnd = React.useCallback((mIdx: number) => sequencerRef.current.handleSetLoopEnd(mIdx), []);
  const handleClearLoop = React.useCallback(() => sequencerRef.current.handleClearLoop(), []);
  const handleCopyPattern = React.useCallback((ptn: Pattern) => sequencerRef.current.handleCopyPattern(ptn), []);
  const handlePastePattern = React.useCallback((tId: number, pId?: number) => sequencerRef.current.handlePastePattern(tId, pId), []);
  const handleLoadLibraryPattern = React.useCallback((tId: number, targetPtnId: number, libPattern: any) => sequencerRef.current.handleLoadLibraryPattern(tId, targetPtnId, libPattern), []);
  const handleCreateSongSection = React.useCallback((name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => sequencerRef.current.handleCreateSongSection(name, start, end, color, repeatCount, level), []);
  const handleUpdateSongSection = React.useCallback((id: string, name: string, start: number, end: number, color?: string, level?: number) => sequencerRef.current.handleUpdateSongSection(id, name, start, end, color, level), []);
  const handleDeleteSongSection = React.useCallback((id: string) => sequencerRef.current.handleDeleteSongSection(id), []);
  const handleCopySongSection = React.useCallback((sec: SongSection) => sequencerRef.current.handleCopySongSection(sec), []);
  const handlePasteSongSection = React.useCallback((dest: number) => sequencerRef.current.handlePasteSongSection(dest), []);
  const handleStepValueSelectAndToggle = React.useCallback((tId: number, pId: number, sIdx: number, state: string | number, l?: string, n?: string) => sequencerRef.current.handleStepValueSelectAndToggle(tId, pId, sIdx, state, l, n), []);
  const handleVoiceTypeToggle = React.useCallback((tId: number, pId: number, sIdx: number) => sequencerRef.current.handleVoiceTypeToggle(tId, pId, sIdx), []);
  const handleVoiceSylChange = React.useCallback((tId: number, pId: number, sIdx: number, val: string) => sequencerRef.current.handleVoiceSylChange(tId, pId, sIdx, val), []);
  const handleVoiceNoteChange = React.useCallback((tId: number, pId: number, sIdx: number, val: string) => sequencerRef.current.handleVoiceNoteChange(tId, pId, sIdx, val), []);
  const handleVoiceNoteBlur = React.useCallback((tId: number, pId: number, sIdx: number, val: string) => sequencerRef.current.handleVoiceNoteBlur(tId, pId, sIdx, val), []);
  const handleExtractLyrics = React.useCallback(() => sequencerRef.current.handleExtractLyrics(), []);
  const handleTrackStepValueChange = React.useCallback((tId: number, pId: number, sIdx: number | number[], val: string | string[], l?: string[], n?: string[]) => sequencerRef.current.handleTrackStepValueChange(tId, pId, sIdx, val, l, n), []);
  const handleTrackStepKeyDown = React.useCallback((tId: number, pId: number, sIdx: number, k: string, w: string, el: HTMLInputElement) => sequencerRef.current.handleTrackStepKeyDown(tId, pId, sIdx, k, w, el), []);

  const handleStepTouchStart = React.useCallback((
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
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
      currentVal: currentVal as string | number,
      onSelect,
      isStickyDefault: e.type !== 'touchstart',
      trackId,
      isSplit
    });
    setHoveredStroke(String(currentVal));
  }, []);

  const handlePresetSelect = React.useCallback((val: string) => audioRef.current.handlePresetSelect(val), []);
  const handleShare = React.useCallback(async () => {
    const isPt = sequencer.lang === 'pt';
    const textStr = isPt 
      ? "Descubra O Girador, o sequenciador interativo de Maracatu! https://ogirador.web.app" 
      : "Découvrez O Girador, le séquenceur de Maracatu interactif ! https://ogirador.web.app";
    try {
      await navigator.clipboard.writeText(textStr);
      setToastMessage(isPt ? 'Link copiado para a área de transferência!' : 'Lien copié dans le presse-papier !');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Clipboard write failed:", err);
      window.prompt(isPt ? "Copie este texto:" : "Copiez ce texte :", textStr);
    }
  }, [sequencer.lang]);
  const handleSaveState = React.useCallback(() => audioRef.current.handleSaveState(), []);
  const handleCloudSave = React.useCallback(() => {
    const state = useSequencerStore.getState();
    const metadata = sequencerRef.current?.metadata;
    setSectionToSave({
      id: `full-${Date.now()}`,
      name: metadata?.toada?.trim() || 'Morceau complet',
      startMeasure: 1,
      endMeasure: state.totalMeasures,
      color: '#8b2a1a',
      isLooping: false,
      isMuted: false
    });
  }, []);
  const handleLoadState = React.useCallback((file: File) => audioRef.current.handleLoadState(file), []);
  
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetDataToSave, setPresetDataToSave] = useState<any>(null);

  const handleSaveToLocal = React.useCallback(async () => {
    const presetData = audioRef.current.getCurrentPresetData();
    setPresetDataToSave(presetData);
    setShowSavePresetModal(true);
  }, []);

  const handleLoadLocalPreset = React.useCallback((name: string) => audioRef.current.handleLoadLocalPreset(name), []);
  const handleAddTrackInstrument = React.useCallback((instIdx: number) => sequencerRef.current.handleAddTrackInstrument(instIdx, useSequencerStore.getState().currentMeasure), []);

  const handleAdminClick = React.useCallback(() => changeViewMode('admin'), [changeViewMode]);
  const handleToggleRightPanel = React.useCallback((p: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais', force?: boolean) => {
    setActiveRightPanel(prev => (prev === p && !force) ? null : p);
  }, []);

  const handleToggleSidebarPanel = React.useCallback(() => {
    setActiveRightPanel(prev => prev === 'letras' ? 'legend' : 'letras');
  }, []);

  const handleToggleHideGlobalSignals = React.useCallback(() => {
    setHideGlobalSignals(prev => !prev);
  }, []);

  const handleClearJustUnlocked = React.useCallback(() => setJustUnlockedBookletId(null), []);

  const handleHomeEnter = React.useCallback((mode: string) => changeViewMode(mode as any), [changeViewMode]);
  const handleLandingEnter = React.useCallback(() => changeViewMode('roda'), [changeViewMode]);


  const handleExportTablature = React.useCallback(() => {
    const tracks = useSequencerStore.getState().tracks;
    const validTrackIds = tracks
      .filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.type !== 'voice')
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
      <SEO />
      {viewMode === 'landing' ? (
        <Suspense fallback={<div className="min-h-screen bg-[var(--cordel-bg)] flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
          <LandingPage onEnter={handleLandingEnter} lang={sequencer.lang} />
        </Suspense>
      ) : viewMode === 'home' ? (
        <Home onEnter={handleHomeEnter} lang={sequencer.lang} />
      ) : (
        <div className="flex flex-col h-dvh text-[var(--cordel-text)] bg-[var(--cordel-bg)] overflow-hidden select-none font-sans relative">

      {/* Header controls bar */}
      <Header
        showInstallButton={!!deferredPrompt}
        onInstallClick={handleInstallClick}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onExportTablature={handleExportTablature}
        onAdminClick={handleAdminClick}
        presetFiles={presetFiles}
        localPresets={localPresets}
        cloudPresets={cloudPresets}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={handleToggleRightPanel}
        onCloudSave={handleSaveToLocal}
        viewMode={viewMode as any}
        onViewModeToggle={changeViewMode}
        isMobile={isMobile}
        mobileTab={mobileTab}
        onMobileTabToggle={setMobileTab}
        version={CURRENT_VERSION}
      />

      {/* Main Workspace workspace containing expanding grids layouts */}
      <MainWorkspaceLayout
        viewMode={viewMode}
        renderedView={renderedView}
        isFadingIn={isFadingIn}
        hasVisitedStudio={hasVisitedStudio}
        isMobile={isMobile}
        mobileTab={mobileTab}
        setMobileTab={(tab) => setMobileTab(tab as any)}
        filteredMestreSignals={filteredMestreSignals}
        refreshMestreSignals={refreshMestreSignals}
        hideGlobalSignals={hideGlobalSignals}
        onToggleHideGlobalSignals={handleToggleHideGlobalSignals}
        measureWidth={measureWidth}
        setMeasureWidth={setMeasureWidth}
        setSectionToSave={setSectionToSave}
        setLoadSectionInsertMeasure={setLoadSectionInsertMeasure}
        mestreRhythmState={mestreRhythmState}
        setMestreRhythmState={setMestreRhythmState}
        unlockedFolhetos={unlockedFolhetos}
        justUnlockedBookletId={justUnlockedBookletId}
        onClearJustUnlocked={handleClearJustUnlocked}

        presetFiles={presetFiles}
        localPresets={localPresets}
        onStepTouchStart={(e, pId, sIdx, iId, cur, onSel, tId?: number, isSplit?: boolean) => handleStepTouchStart(e, pId, sIdx, iId, cur, onSel, tId !== undefined ? tId : 0, isSplit)}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={handleToggleRightPanel}
      />

      {viewMode !== 'quiz' && viewMode !== 'dictee' && viewMode !== 'inspecteur' && viewMode !== 'mestre' && viewMode !== 'rythmelive' && viewMode !== 'varal' && viewMode !== 'studio' && viewMode !== 'admin' && (
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

      {/* Global Modals Container */}
      <GlobalModalsLayout
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        selectedExportTracks={selectedExportTracks}
        setSelectedExportTracks={setSelectedExportTracks}
        selectedAnnexTracks={selectedAnnexTracks}
        setSelectedAnnexTracks={setSelectedAnnexTracks}
        executeExport={executeExport}
        printLegendOnly={printLegendOnly}
        customDialog={customDialog}
        setCustomDialog={setCustomDialog}
        sectionToSave={sectionToSave}
        setSectionToSave={setSectionToSave}
        loadSectionInsertMeasure={loadSectionInsertMeasure}
        setLoadSectionInsertMeasure={setLoadSectionInsertMeasure}
        isMobile={isMobile}
        mobileTab={mobileTab}
        viewMode={viewMode}
        toastMessage={toastMessage}
        handleStepTouchStart={handleStepTouchStart}
      />

      {showSavePresetModal && presetDataToSave && (
        <SavePresetModal
          presetData={presetDataToSave}
          defaultName={presetDataToSave.metadata?.toada || ''}
          onClose={() => setShowSavePresetModal(false)}
          lang={sequencer.lang}
        />
      )}

      {isIntroModalOpen && (
        <NewSongIntroModal
          onClose={() => setIntroModalOpen(false)}
          onClearSong={() => {
            setIntroModalOpen(false);
            sequencer.handleClear();
          }}
          onStartWizard={() => {
            setIntroModalOpen(false);
            setWizardOpen(true);
          }}
          lang={sequencer.lang}
        />
      )}

      {showMandatoryVisitorModal && (
        <VisitorAuthModal 
          lang={sequencer.lang} 
          onClose={() => setShowMandatoryVisitorModal(false)}
          isMandatory={true}
        />
      )}

      {isWizardOpen && (
        <WizardOverlay
          onClose={() => setWizardOpen(false)}
          lang={sequencer.lang}
        />
      )}

      {isSettingsOpen && (
        <SettingsPage mestreSignals={mestreSignals} />
      )}

    </div>
      )}
    </>
  );
}
