
import React, { useState, useMemo, Suspense } from 'react';
import { useSequencer } from './contexts/SequencerContext';
import { useAudio } from './contexts/AudioContext';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { SEO } from './components/SEO';
import { Home } from './components/Home';
import { MainWorkspaceLayout } from './components/MainWorkspaceLayout';
import { AppModalsContainer } from './components/app/AppModalsContainer';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useSequencerStore, isToadaChild } from './stores/useSequencerStore';
import { useCloudPresets } from './hooks/queries/useCloudPresets';
import { useAppUpdate, CURRENT_VERSION } from './hooks/useAppUpdate';
import { useAppAudio } from './hooks/useAppAudio';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';
import { useGlobalTransportShortcuts } from './hooks/useGlobalTransportShortcuts';
import { useViewRouter } from './hooks/useViewRouter';
import { useThemeManager } from './hooks/useThemeManager';
import { useWallpaper } from './hooks/useWallpaper';
import { useMidiController } from './hooks/useMidiController';
import { useTrainingUrlHandler } from './hooks/useTrainingUrlHandler';
import { useDeepLinkLoader } from './hooks/useDeepLinkLoader';
import { useDisableNativeContextMenu } from './hooks/useDisableNativeContextMenu';
import { useAppSessionTracking } from './hooks/useAppSessionTracking';
import { useAppGroupPresetLoader } from './hooks/useAppGroupPresetLoader';
import { useAppMestreSignals } from './hooks/useAppMestreSignals';
import { useAppExportTablature } from './hooks/useAppExportTablature';
import { useAppWorkspaceEvents } from './hooks/useAppWorkspaceEvents';
import { useAppAuthPermissions } from './hooks/useAppAuthPermissions';
import { useIsMobileResponsive } from './hooks/useIsMobileResponsive';
import { useScreenWakeLock } from './hooks/useScreenWakeLock';
import { MobileRemoteRouter } from './components/mobile/MobileRemoteRouter';

const LandingPage = lazyWithRetry(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })), 'LandingPage');

export default function App() {
  useDisableNativeContextMenu();
  const { deferredPrompt, handleInstallClick } = useAppUpdate();
  const { presetFiles, localPresets, isSavedIndicatorVisible } = useAppAudio();
  useGlobalKeyboardShortcuts(); useMidiController();

  const sequencer = useSequencer(), audio = useAudio();
  useScreenWakeLock(audio.isPlaying);
  useGlobalTransportShortcuts(audio.handleTogglePlay);
  const { hasAccess, userProfile, isAdmin, loading: authLoading } = useAuth();
  useDeepLinkLoader({ audio, sequencer, authLoading });
  useAppAuthPermissions(userProfile, isAdmin); useAppSessionTracking(userProfile);

  const [activeRightPanel, setActiveRightPanel] = useState<'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null>(() => (typeof window !== 'undefined' && window.innerWidth < 1280 ? null : 'info'));
  const { viewMode, renderedView, isFadingIn, changeViewMode, hasManuallyOpenedAbout } = useViewRouter({ audio, setActiveRightPanel: (p) => setActiveRightPanel(p) });
  const theme = useThemeManager({ lang: sequencer.lang }), wallpaperProps = useWallpaper();
  useTrainingUrlHandler({ audio, changeViewMode, alertAsync: sequencer.alertAsync });

  const [showSavePresetModal, setShowSavePresetModal] = useState(false), [presetDataToSave, setPresetDataToSave] = useState<any>(null);
  const handleSaveToLocal = React.useCallback(async () => {
    setPresetDataToSave(audio.getCurrentPresetData());
    setShowSavePresetModal(true);
  }, [audio]);

  const { toastMessage, showMandatoryVisitorModal, setShowMandatoryVisitorModal, isPaperWorkshopOpen, setIsPaperWorkshopOpen, paperWorkshopInitialTab, setPaperWorkshopInitialTab } = useAppWorkspaceEvents(sequencer.alertAsync, changeViewMode, viewMode, handleSaveToLocal);

  const { data: cloudPresetsData, isLoading: isCloudPresetsLoading } = useCloudPresets({
    userUid: userProfile?.uid || null,
    userRole: (userProfile?.role === 'admin' || userProfile?.canWriteSequenciador) ? 'admin' : (userProfile?.role || 'visiteur'),
    mestreId: userProfile?.mestreId || null,
    groupId: userProfile?.groupId || userProfile?.groupName || (userProfile as any)?.association || null,
    groupName: userProfile?.groupName || null,
    canWriteSequenciador: !!userProfile?.canWriteSequenciador
  });

  const cloudPresets = useMemo(() => (cloudPresetsData || []).map(p => ({ ...p, isDraft: (p as any).isDraft ?? false })), [cloudPresetsData]);
  useAppGroupPresetLoader({ groupId: userProfile?.groupId, cloudPresets, audio });
  const { mestreSignals, filteredMestreSignals, refreshMestreSignals, hideGlobalSignals, handleToggleHideGlobalSignals } = useAppMestreSignals(userProfile, hasAccess);
  const exportProps = useAppExportTablature({ sequencer });

  const [touchSelector, setTouchSelector] = useState<any | null>(null), [hoveredStroke, setHoveredStroke] = useState<string | null>(null);
  const [sectionToSave, setSectionToSave] = useState<any | null>(null), [loadSectionInsertMeasure, setLoadSectionInsertMeasure] = useState<number | null>(null);
  const [measureWidth, setMeasureWidth] = useState<number>(240), [mobileTab, setMobileTab] = useState<'roda' | 'mixer' | 'toada'>('roda');
  const isMobile = useIsMobileResponsive(768), editingTrackId = useSequencerStore(state => state.editingTrackId);
  const mobileViewMode = useSequencerStore((s) => s.mobileViewMode), isMobileStudioMode = useSequencerStore((s) => s.isMobileStudioMode);
  const isMobileRemoteActive = isMobile && mobileViewMode !== 'complet' && !isMobileStudioMode && viewMode !== 'admin';

  const handleStepTouchStart = React.useCallback((e: any, patternId: number, stepIdx: number, instId: string, currentVal: any, onSelect: any, trackId: number, isSplit?: boolean) => {
    if ('button' in e && e.button !== 0) return;
    const target = e.currentTarget as HTMLElement, rect = target.getBoundingClientRect();
    const clickX = e.clientX ?? (e.touches?.[0]?.clientX || (rect.left + rect.width / 2));
    const clickY = e.clientY ?? (e.touches?.[0]?.clientY || rect.top);
    setTouchSelector({ patternId, stepIdx, instId, x: clickX, y: clickY, currentVal, onSelect, isStickyDefault: e.type !== 'touchstart', trackId, isSplit });
    setHoveredStroke(String(currentVal));
  }, []);

  const handleOpenDefaultInstrumentEditor = React.useCallback(() => {
    const s = useSequencerStore.getState();
    if (s.editingTrackId !== null) { s.setEditingTrackId(null); return; }
    const t = s.tracks.find(tr => !tr.isHidden && !isToadaChild(tr, s.tracks) && (!tr.isBusFolder || tr.isLinkFolder)) || s.tracks[0];
    if (t) s.setEditingTrackId(t.id);
  }, []);

  const handleToggleDetachInstrumentEditor = React.useCallback(() => {
    const s = useSequencerStore.getState();
    const t = s.tracks.find(tr => !tr.isHidden && !isToadaChild(tr, s.tracks) && (!tr.isBusFolder || tr.isLinkFolder)) || s.tracks[0];
    if (t && s.editingTrackId === null) s.setEditingTrackId(t.id);
    s.toggleInstrumentEditorDetached();
  }, []);

  if (viewMode === 'landing') return <><SEO /><Suspense fallback={<div className="min-h-screen bg-[var(--cordel-bg)] flex justify-center items-center"><svg className="animate-spin w-8 h-8 stroke-current fill-none stroke-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" /></svg></div>}><LandingPage onEnter={() => { useSequencerStore.getState().setMobileViewMode('complet'); changeViewMode('roda'); }} lang={sequencer.lang} onLanguageChange={sequencer.setLang} isManualOpen={hasManuallyOpenedAbout} /></Suspense></>;
  if (viewMode === 'home') return <><SEO /><Home onEnter={(m) => changeViewMode(m as any)} lang={sequencer.lang} /></>;

  return (
    <>
      <SEO />
      <div className="flex flex-col h-dvh text-[var(--cordel-text)] bg-[var(--cordel-bg)] overflow-hidden select-none font-sans relative">
        {isMobileRemoteActive ? (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#121212] text-[#f4ecd8] font-cactus text-sm">Chargement...</div>}>
            <MobileRemoteRouter
              mobileViewMode={mobileViewMode} audio={audio} cloudPresets={cloudPresets} localPresets={localPresets} theme={theme}
              onOpenPaperWorkshop={(tab) => { if (tab) setPaperWorkshopInitialTab(tab); setIsPaperWorkshopOpen(true); }}
              onOpenLyricsVideo={() => setActiveRightPanel('letras')}
            />
          </Suspense>
        ) : (
          <>
            <Header showInstallButton={!!deferredPrompt} onInstallClick={handleInstallClick} isDarkMode={theme.isDarkMode} onToggleDarkMode={theme.toggleDarkMode} onExportTablature={exportProps.handleExportTablature} onAdminClick={() => changeViewMode('admin')} presetFiles={presetFiles} localPresets={localPresets} cloudPresets={cloudPresets} isCloudPresetsLoading={isCloudPresetsLoading} activeRightPanel={activeRightPanel} onToggleRightPanel={(p: any, force?: boolean) => setActiveRightPanel(prev => (force ? p : (prev === p ? null : p)))} onCloudSave={handleSaveToLocal} viewMode={viewMode as any} onViewModeToggle={changeViewMode} isMobile={isMobile} mobileTab={mobileTab} onMobileTabToggle={setMobileTab} version={CURRENT_VERSION} onOpenInstrumentEditor={handleOpenDefaultInstrumentEditor} onToggleDetachInstrumentEditor={handleToggleDetachInstrumentEditor} editingTrackId={editingTrackId} onOpenWallpaperModal={wallpaperProps.openWallpaperModal} onOpenPaperWorkshop={(tab) => { if (tab) setPaperWorkshopInitialTab(tab); setIsPaperWorkshopOpen(true); }} />
            <MainWorkspaceLayout viewMode={viewMode} renderedView={renderedView} isFadingIn={isFadingIn} isMobile={isMobile} mobileTab={mobileTab} setMobileTab={(t) => setMobileTab(t as any)} filteredMestreSignals={filteredMestreSignals} refreshMestreSignals={refreshMestreSignals} hideGlobalSignals={hideGlobalSignals} onToggleHideGlobalSignals={handleToggleHideGlobalSignals} measureWidth={measureWidth} setMeasureWidth={setMeasureWidth} setSectionToSave={setSectionToSave} setLoadSectionInsertMeasure={setLoadSectionInsertMeasure} presetFiles={presetFiles} localPresets={localPresets} onStepTouchStart={(e, pId, sIdx, iId, cur, onSel, tId, isSplit) => handleStepTouchStart(e, pId, sIdx, iId, cur, onSel, tId !== undefined ? tId : 0, isSplit)} activeRightPanel={activeRightPanel} onToggleRightPanel={(p: any, force?: boolean) => setActiveRightPanel(prev => (force ? p : (prev === p ? null : p)))} />
            {viewMode !== 'admin' && <TransportBar viewMode={viewMode as any} />}
          </>
        )}
        <AppModalsContainer touchSelector={touchSelector} hoveredStroke={hoveredStroke} setTouchSelector={setTouchSelector} setHoveredStroke={setHoveredStroke} isSavedIndicatorVisible={isSavedIndicatorVisible} lang={sequencer.lang} exportProps={exportProps} modalLayoutProps={{ showExportMenu: exportProps.showExportMenu, setShowExportMenu: exportProps.setShowExportMenu, selectedExportTracks: exportProps.selectedExportTracks, setSelectedExportTracks: exportProps.setSelectedExportTracks, selectedAnnexTracks: exportProps.selectedAnnexTracks, setSelectedAnnexTracks: exportProps.setSelectedAnnexTracks, executeExport: exportProps.executeExport, printLegendOnly: exportProps.printLegendOnly, customDialog: sequencer.customDialog, setCustomDialog: sequencer.setCustomDialog, sectionToSave, setSectionToSave, loadSectionInsertMeasure, setLoadSectionInsertMeasure, isMobile, mobileTab, viewMode, toastMessage, handleStepTouchStart }} saveModalProps={{ showSavePresetModal, setShowSavePresetModal, presetDataToSave }} visitorAuthProps={{ showMandatoryVisitorModal, setShowMandatoryVisitorModal }} wallpaperProps={wallpaperProps} paperWorkshopProps={{ isPaperWorkshopOpen, setIsPaperWorkshopOpen, paperWorkshopInitialTab }} mestreSignals={mestreSignals} audio={audio} sequencer={sequencer} changeViewMode={changeViewMode} />
      </div>
    </>
  );
}
