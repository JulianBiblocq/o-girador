/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense, useTransition } from 'react';
import { useGameData } from './contexts/GameDataContext';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from './contexts/SequencerContext';
import { useAudio } from './contexts/AudioContext';
import { useAuth } from './contexts/AuthContext';
import { i18n, instrumentsConfig } from './data';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { useSequencerStore } from './stores/useSequencerStore';
import { useSequencerSettingsStore } from './stores/useSequencerSettingsStore';
import { SettingsPage } from './components/SettingsPage';
import { TouchStrokeSelector } from './components/TouchStrokeSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainWorkspaceLayout } from './components/MainWorkspaceLayout';
import { GlobalModalsLayout } from './components/GlobalModalsLayout';

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

export default function App() {
  // 1. Core hook extraction setup
  const { deferredPrompt, handleInstallClick } = useAppUpdate();
  const { presetFiles, localPresets, isSavedIndicatorVisible, refreshLocalPresets } = useAppAudio();
  useGlobalKeyboardShortcuts();

  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);

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
  const { hasAccess, userProfile, updateUserPreference } = useAuth();
  const { completeExercise } = useGameData();
  const [activeVaralExercise, setActiveVaralExercise] = useState<any>(null);

  // Context and unstable state Refs to maximize callback stabilization
  const sequencerRef = React.useRef(sequencer);
  const audioRef = React.useRef(audio);
  const userProfileRef = React.useRef(userProfile);
  const updateUserPreferenceRef = React.useRef(updateUserPreference);
  const contextHasAccessRef = React.useRef(hasAccess);
  const activeVaralExerciseRef = React.useRef(activeVaralExercise);
  const completeExerciseRef = React.useRef(completeExercise);
  const alertAsyncRef = React.useRef(alertAsync);
  const confirmAsyncRef = React.useRef(confirmAsync);
  const promptAsyncRef = React.useRef(promptAsync);
  const setCustomDialogRef = React.useRef(setCustomDialog);

  React.useEffect(() => { sequencerRef.current = sequencer; }, [sequencer]);
  React.useEffect(() => { audioRef.current = audio; }, [audio]);
  React.useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);
  React.useEffect(() => { updateUserPreferenceRef.current = updateUserPreference; }, [updateUserPreference]);
  React.useEffect(() => { contextHasAccessRef.current = hasAccess; }, [hasAccess]);
  React.useEffect(() => { activeVaralExerciseRef.current = activeVaralExercise; }, [activeVaralExercise]);
  React.useEffect(() => { completeExerciseRef.current = completeExercise; }, [completeExercise]);
  React.useEffect(() => { alertAsyncRef.current = alertAsync; }, [alertAsync]);
  React.useEffect(() => { confirmAsyncRef.current = confirmAsync; }, [confirmAsync]);
  React.useEffect(() => { promptAsyncRef.current = promptAsync; }, [promptAsync]);
  React.useEffect(() => { setCustomDialogRef.current = setCustomDialog; }, [setCustomDialog]);




  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [selectedExportTracks, setSelectedExportTracks] = useState<Set<number>>(new Set());
  const [selectedAnnexTracks, setSelectedAnnexTracks] = useState<Set<number>>(new Set());
  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | 'info' | 'feedback' | null>(
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
    mestreId: userProfile?.mestreId || null
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
    const isMestreAdmin = profile?.role === 'mestre' || profile?.role === 'admin';
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
    } else {
      // Even if no mestre ID, we can fetch 'global' signals
      const { signals } = await fetchMestreSignals('global');
      setMestreSignals(signals);
    }
  }, []);

  useEffect(() => {
    refreshMestreSignals();
  }, [userProfile?.uid, userProfile?.mestreId, userProfile?.role, refreshMestreSignals]);

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

  const handleGameSuccess = React.useCallback((moduleName: string) => {
    const normalizedName = moduleName === 'rythme_live' ? 'rythmelive' : (moduleName === 'sablier_mestre' ? 'mestre' : moduleName);
    unlockBooklet(`folheto_${normalizedName}`);
    const activeVaralExercise = activeVaralExerciseRef.current;
    if (activeVaralExercise) {
      completeExerciseRef.current(activeVaralExercise.id);
      changeViewMode('varal');
      setActiveVaralExercise(null);
    }
  }, [unlockBooklet, changeViewMode]);

  const handleGameExit = React.useCallback(() => {
    if (activeVaralExerciseRef.current) {
      changeViewMode('varal');
      setActiveVaralExercise(null);
    } else {
      changeViewMode('roda');
    }
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
  const handleInsertMeasure = React.useCallback((mIdx: number) => sequencerRef.current.handleInsertMeasure(mIdx), []);
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
    currentVal: string | number,
    onSelect: (val: string) => void,
    trackId: number
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
      isStickyDefault: e.type !== 'touchstart',
      trackId
    });
    setHoveredStroke(String(currentVal));
  }, []);

  const handlePresetSelect = React.useCallback((val: string) => audioRef.current.handlePresetSelect(val), []);
  const handleShare = React.useCallback(() => audioRef.current.handleShare(), []);
  const handleSaveState = React.useCallback(() => audioRef.current.handleSaveState(), []);
  const handleLoadState = React.useCallback((file: File) => audioRef.current.handleLoadState(file), []);
  const handleSaveToLocal = React.useCallback(async () => {
    const profile = userProfileRef.current;
    if (profile?.role === 'mestre' || profile?.role === 'admin') {
      const isPt = sequencerRef.current.lang === 'pt';
      const wantCloud = await confirmAsyncRef.current(
        isPt ? 'Onde você deseja salvar esta composição?' : 'Où souhaitez-vous sauvegarder cette composition ?',
        isPt ? '☁️ Nuvem (Catálogo)' : '☁️ Cloud (Catalogue)',
        isPt ? '💾 Local (Meu PC)' : '💾 Local (Mon PC)'
      );
      if (wantCloud) {
        const presetData = audioRef.current.getCurrentPresetData();
        let name = presetData.metadata?.toada?.trim() || '';
        if (!name) {
          const inputName = await promptAsyncRef.current(isPt ? 'Nome do ritmo:' : 'Nom du rythme :');
          if (!inputName) return;
          name = inputName.trim();
          presetData.metadata = { ...presetData.metadata, toada: name } as any;
        }

        let visibility: 'admin_global' | 'mestre_group' | 'specific_user' = 'mestre_group';
        let targetUserId: string | undefined = undefined;

        if (profile.role === 'admin') {
          const makeGlobal = await confirmAsyncRef.current(
            isPt ? 'Tornar global (visível para todos)?' : 'Rendre global (visible par tous) ?',
            isPt ? 'Sim (Global)' : 'Oui (Global)',
            isPt ? 'Não (Restrito)' : 'Non (Restreint)'
          );
          if (makeGlobal) {
            visibility = 'admin_global';
          } else {
            const specificTarget = await promptAsyncRef.current(
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
          await savePresetToCloud(name, presetData, profile.uid, visibility, targetUserId);
          await alertAsyncRef.current(isPt ? '✅ Salvo na nuvem!' : '✅ Sauvegardé dans le cloud !');
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
            await alertAsyncRef.current('Error saving to cloud');
          }
        }
        return;
      }
    }
    audioRef.current.handleSaveToLocal();
  }, [queryClient]);

  const handleLoadLocalPreset = React.useCallback((name: string) => audioRef.current.handleLoadLocalPreset(name), []);
  const handleAddTrackInstrument = React.useCallback((instIdx: number) => sequencerRef.current.handleAddTrackInstrument(instIdx, useSequencerStore.getState().currentMeasure), []);

  const handleAdminClick = React.useCallback(() => changeViewMode('admin'), [changeViewMode]);
  const handleToggleRightPanel = React.useCallback((p: 'legend' | 'letras' | 'info' | 'feedback', force?: boolean) => {
    setActiveRightPanel(prev => (prev === p && !force) ? null : p);
  }, []);

  const handleToggleSidebarPanel = React.useCallback(() => {
    setActiveRightPanel(prev => prev === 'letras' ? 'legend' : 'letras');
  }, []);

  const handleToggleHideGlobalSignals = React.useCallback(() => {
    setHideGlobalSignals(prev => !prev);
  }, []);

  const handleVaralExit = React.useCallback(() => changeViewMode('roda'), [changeViewMode]);
  const handleClearJustUnlocked = React.useCallback(() => setJustUnlockedBookletId(null), []);
  
  const handleLaunchExercise = React.useCallback((ex: any, cordeIndex: number) => {
    setActiveVaralExercise(ex);
    setActiveCordeIndex(cordeIndex);
    if (ex.module === 'quiz') changeViewMode('quiz');
    else if (ex.module === 'dictee') changeViewMode('dictee');
    else if (ex.module === 'inspecteur') changeViewMode('inspecteur');
    else if (ex.module === 'rythme_live') changeViewMode('rythmelive');
    else if (ex.module === 'sablier_mestre') changeViewMode('mestre');
  }, [changeViewMode]);

  const handleHomeEnter = React.useCallback((mode: string) => changeViewMode(mode as any), [changeViewMode]);
  const handleLandingEnter = React.useCallback(() => changeViewMode('roda'), [changeViewMode]);

  const handleQuizSuccess = React.useCallback(() => handleGameSuccess('quiz'), [handleGameSuccess]);
  const handleDicteeSuccess = React.useCallback(() => handleGameSuccess('dictee'), [handleGameSuccess]);
  const handleInspecteurSuccess = React.useCallback(() => handleGameSuccess('inspecteur'), [handleGameSuccess]);
  const handleMestreSuccess = React.useCallback(() => handleGameSuccess('sablier_mestre'), [handleGameSuccess]);
  const handleRythmeLiveSuccess = React.useCallback(() => handleGameSuccess('rythme_live'), [handleGameSuccess]);

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
      {viewMode === 'landing' ? (
        <Suspense fallback={<div className="min-h-screen bg-[var(--cordel-bg)] flex justify-center items-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
          <LandingPage onEnter={handleLandingEnter} lang={sequencer.lang} />
        </Suspense>
      ) : viewMode === 'home' ? (
        <Home onEnter={handleHomeEnter} lang={sequencer.lang} />
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
        onAdminClick={handleAdminClick}
        presetFiles={presetFiles}
        localPresets={localPresets}
        cloudPresets={cloudPresets}
        activeRightPanel={activeRightPanel}
        onToggleRightPanel={handleToggleRightPanel}
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
        onLaunchExercise={(ex) => handleLaunchExercise(ex, 0)}
        onGameExit={handleGameExit}
        onQuizSuccess={handleQuizSuccess}
        onDicteeSuccess={handleDicteeSuccess}
        onInspecteurSuccess={handleInspecteurSuccess}
        onMestreSuccess={handleMestreSuccess}
        onRythmeLiveSuccess={handleRythmeLiveSuccess}
        onVaralExit={handleVaralExit}
        presetFiles={presetFiles}
        localPresets={localPresets}
        onStepTouchStart={(e, pId, sIdx, iId, cur, onSel) => handleStepTouchStart(e, pId, sIdx, iId, cur, onSel, 0)}
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

      {isSettingsOpen && (
        <SettingsPage mestreSignals={mestreSignals} />
      )}
    </div>
      )}
    </>
  );
}
