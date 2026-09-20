import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  Save,
  FolderOpen,
  BookOpen,
  FileText,
  Video,
  Share2,
  SlidersHorizontal,
  MessageSquare,
  Download,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { BoutonExportDanse } from './BoutonExportDanse';
import { AudioFader } from './AudioFader';
import { GlobalSwingModal } from './GlobalSwingModal';
import { Language } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { GoogleLoginButton } from './GoogleLoginButton';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useShallow } from 'zustand/react/shallow';
import { XiloRoda, XiloConsole, XiloTimeline, XiloSun, XiloMoon, XiloDrum } from './XiloIcons';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { MiniTelemetryBadge } from './TelemetryBadge';
import { useWizardStore } from '../stores/useWizardStore';
import { PresetAccordionSelector } from './PresetAccordionSelector';
import { isPresetAuthorized } from '../cloudLibrary';

const UndoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Silhouette principale de la flèche avec fond jaune or pour un aspect actif et lumineux */}
    <path
      d="M 16 28 L 41 12 L 36 25 C 64 20, 82 42, 80 74 C 79 84, 75 90, 70 92 C 72 84, 74 72, 66 54 C 57 37, 43 29, 36 31 L 41 45 L 16 28 Z"
      fill="#ffd369"
    />
    {/* Hachures de texture pointillée pour simuler la gravure sur bois (xilogravura) */}
    <path
      d="M 46 36 C 56 34, 66 44, 69 57"
      strokeDasharray="2 3"
      strokeWidth="1.5"
    />
  </svg>
);

const RedoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={{ transform: 'scaleX(-1)' }}
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Version miroir horizontal du tracé de Undo */}
    <path
      d="M 16 28 L 41 12 L 36 25 C 64 20, 82 42, 80 74 C 79 84, 75 90, 70 92 C 72 84, 74 72, 66 54 C 57 37, 43 29, 36 31 L 41 45 L 16 28 Z"
      fill="#ffd369"
    />
    <path
      d="M 46 36 C 56 34, 66 44, 69 57"
      strokeDasharray="2 3"
      strokeWidth="1.5"
    />
  </svg>
);

interface HeaderProps {
  presetFiles: string[];
  localPresets: string[];
  cloudPresets?: {
    id: string;
    name: string;
    visibility?: string;
    groupId?: string | null;
    ownerId?: string;
    mestreId?: string | null;
    [key: string]: any;
  }[];
  isCloudPresetsLoading?: boolean;

  viewMode: string;
  onViewModeToggle: (mode: any) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMobile: boolean;
  mobileTab?: 'roda' | 'mixer' | 'toada';
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  activeRightPanel?: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais') => void;
  version?: string | number;
  onExportTablature?: () => void;
  showInstallButton?: boolean;
  onInstallClick?: () => void;
  onAdminClick?: () => void;
  onCloudSave?: () => void;
  onOpenInstrumentEditor?: () => void;
  onToggleDetachInstrumentEditor?: () => void;
  editingTrackId?: number | null;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  presetFiles = [],
  localPresets = [],
  cloudPresets = [],
  isCloudPresetsLoading = false,

  viewMode,
  onViewModeToggle,
  isDarkMode,
  onToggleDarkMode,
  isMobile,
  mobileTab = 'roda',
  onMobileTabToggle,
  activeRightPanel,
  onToggleRightPanel,
  version,
  onExportTablature,
  showInstallButton,
  onInstallClick,
  onAdminClick,
  onCloudSave,
  onOpenInstrumentEditor,
  onToggleDetachInstrumentEditor,
  editingTrackId = null,
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { hasAccess, userProfile, isAdmin } = useAuth();
  const toggleSettings = useSequencerSettingsStore((state) => state.toggleSettings);
  const isInstrumentEditorDetached = useSequencerStore((state) => state.isInstrumentEditorDetached);

  const {
    lang,
    setLang,
    timeSig,
    setTotalMeasures,
    handleUndo,
    handleRedo,
    handleClear,
    handleAddTrackInstrument,
  } = sequencer;

  const tracksHistory = useSequencerStore(state => state.tracksHistory);
  const tracksRedoHistory = useSequencerStore(state => state.tracksRedoHistory);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const metadata = useSequencerStore(state => state.metadata);
  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);

  const {
    globalSwing,
    setGlobalSwing
  } = useTransportStore(
    useShallow((state) => ({
      globalSwing: state.globalSwing,
      setGlobalSwing: state.setGlobalSwing
    }))
  );

  const {
    activePresetName: preset,
    handlePresetSelect: onPresetChange,
    handleSaveToLocal: onSaveToLocal,
    handleLoadLocalPreset: onLoadLocalPreset,
    masterVol,
    setMasterVol,
    handleTimeSigChange: onTimeSigChange,
  } = audio;

  const onLangToggle = () => setLang(lang === 'pt' ? 'fr' : 'pt');
  const onClear = () => {
    useWizardStore.getState().setIntroModalOpen(true);
  };
  const onAddInstrument = handleAddTrackInstrument;
  const onUndo = handleUndo;
  const canUndo = tracksHistory.length > 0;
  const onRedo = handleRedo;
  const canRedo = tracksRedoHistory.length > 0;
  const [isSwingModalOpen, setIsSwingModalOpen] = useState(false);
  const isSamambaia = Boolean(
    userProfile?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    (userProfile?.groupId && (userProfile.groupId.toLowerCase().includes('samambaia') || userProfile.groupId.toLowerCase().includes('sammbia'))) ||
    userProfile?.mestreId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    userProfile?.canWriteSequenciador
  );
  const groupLabel = userProfile?.groupName || (isSamambaia ? 'Samambaia' : userProfile?.groupId) || null;
  const isPublicPreset = (p: { visibility?: string }) =>
    p.visibility === 'admin_global' || p.visibility === 'public';
  const publicCloudPresets = (cloudPresets || []).filter(isPublicPreset);
  const privateCloudPresets = (cloudPresets || []).filter((p) => {
    if (isPublicPreset(p)) return false;
    return isPresetAuthorized(
      p as any,
      userProfile?.uid || '',
      userProfile?.role || '',
      userProfile?.mestreId || (isSamambaia ? 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' : null),
      userProfile?.groupId,
      isSamambaia,
      userProfile?.canWriteSequenciador
    );
  });
  const showGroupCatalogue = Boolean(groupLabel && (privateCloudPresets.length > 0 || isSamambaia || userProfile?.groupId));
  const onMasterVolChange = setMasterVol;
  const onTotalMeasuresChange = setTotalMeasures;

  // --- ECO MODE ---
  const ecoMode = useSequencerStore(state => state.isEcoMode);
  const toggleEcoMode = useSequencerStore(state => state.toggleEcoMode);
  // ----------------
  const [addDropOpen, setAddDropOpen] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);
  
  const [projectDropOpen, setProjectDropOpen] = useState(false);
  const projectDropRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [infoDropOpen, setInfoDropOpen] = useState(false);
  const infoDropRef = useRef<HTMLDivElement>(null);

  const handleShareApp = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'O Girador',
        text: 'O Girador - Sequenciador de Maracatu',
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert(lang === 'pt' ? 'Link copiado!' : 'Lien copié !');
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setProjectDropOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (infoDropRef.current && !infoDropRef.current.contains(e.target as Node)) {
        setInfoDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (isMobile) {
    return (
      <>
      <div
        id="top-bar"
        className="w-full h-[56px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex items-center justify-between px-4 z-50 relative select-none shrink-0"
      >
        {/* Left: Hamburger menu toggle */}
        <div className="flex items-center gap-2" ref={mobileMenuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button flex items-center justify-center font-bold text-lg hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer"
          >
            ☰
          </button>

          {mobileMenuOpen && (
            <div className="absolute top-12 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] w-[280px] max-h-[80vh] overflow-y-auto z-[999] flex flex-col p-3 gap-4">
              
              {/* 📲 PWA INSTALLATION */}
              {showInstallButton && onInstallClick && (
                <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                  <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                    📲 PWA
                  </span>
                  <button
                    onClick={() => {
                      onInstallClick();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[#e67e22] text-[#1a1a1a] hover:opacity-90 font-bold font-cactus uppercase cordel-border-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    {lang === 'pt' ? 'Instalar App' : "Installer l'app"}
                  </button>
                </div>
              )}

              {/* 👤 PERFIL */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  👤 {lang === 'pt' ? 'Perfil' : 'Profil'}
                </span>
                <div className="flex items-center gap-2">
                  <GoogleLoginButton lang={lang} onAdminClick={onAdminClick} align="left" />
                  <button onClick={() => { sequencer.setIsLeftHanded(!sequencer.isLeftHanded); setMobileMenuOpen(false); }} className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer flex-1 ${sequencer.isLeftHanded ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>
                    🫲 {lang === 'pt' ? 'Canhoto' : 'Gaucher'}
                  </button>
                </div>
                <button 
                  onClick={() => { setIsSwingModalOpen(true); setMobileMenuOpen(false); }} 
                  className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer flex justify-between items-center w-full mt-1 ${globalSwing.mode !== 'off' ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[14px] leading-none">〰️</span> {lang === 'pt' ? 'Balanço' : 'Swing'}
                  </div>
                  <span>{globalSwing.mode === 'off' ? 'OFF' : globalSwing.mode === 'maracatu' ? 'ON' : 'CUST'}</span>
                </button>
              </div>
              
              {/* 📂 PROJET */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  📂 {lang === 'pt' ? 'Projeto' : 'Projet'}
                </span>
                
                {/* Presets Selector */}
                <PresetAccordionSelector
                  lang={lang}
                  activePreset={preset}
                  currentSongTitle={metadata?.toada}
                  publicCloudPresets={publicCloudPresets}
                  privateCloudPresets={privateCloudPresets}
                  localPresets={localPresets}
                  isCloudPresetsLoading={isCloudPresetsLoading}
                  showGroupCatalogue={showGroupCatalogue}
                  groupLabel={groupLabel}
                  onSelectPreset={(val) => {
                    onPresetChange(val);
                    setMobileMenuOpen(false);
                  }}
                  className="mt-1"
                />

                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { onClear(); setMobileMenuOpen(false); }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" /> {t('clear')}
                  </button>
                  <button onClick={() => {
                    onExportTablature?.();
                    setMobileMenuOpen(false);
                  }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full">
                    <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Tablatura' : 'Tablature'}
                  </button>
                  <button onClick={() => { onCloudSave?.(); setMobileMenuOpen(false); }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full col-span-2 mt-1 border-none transition-colors">
                    <Save className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Salvar (Cloud)' : 'Sauvegarder (Cloud)'}
                  </button>
                  {(isAdmin || userProfile?.role === 'mestre') && (
                    <div className="col-span-2 mt-1">
                      <BoutonExportDanse />
                    </div>
                  )}
                </div>
              </div>

              {/* 📝 ÉDITION */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  📝 {lang === 'pt' ? 'Edição' : 'Édition'}
                </span>
                
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { onUndo(); setMobileMenuOpen(false); }} disabled={!canUndo} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1">
                    <UndoIcon className="w-4 h-4" /> {lang === 'pt' ? 'Desfazer' : 'Annuler'}
                  </button>
                  <button onClick={() => { onRedo(); setMobileMenuOpen(false); }} disabled={!canRedo} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1">
                    <RedoIcon className="w-4 h-4" /> {lang === 'pt' ? 'Refazer' : 'Rétablir'}
                  </button>
                </div>
              </div>

              {/* 👁️ AFFICHAGE & LANGUE */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  👁️ {lang === 'pt' ? 'Visualização & Idioma' : 'Affichage & Langue'}
                </span>
                
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { onToggleDarkMode(); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-center gap-1">
                    {isDarkMode ? <><XiloSun size={12} className="shrink-0" /> Light</> : <><XiloMoon size={11} className="shrink-0" /> Dark</>}
                  </button>
                  <button onClick={() => { onLangToggle(); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    🌐 {lang === 'pt' ? 'FR' : 'PT'}
                  </button>
                  
                  {/* Information dropdown for mobile / tablet */}
                  <div className="relative col-span-2" ref={infoDropRef}>
                    <button
                      onClick={() => setInfoDropOpen(!infoDropOpen)}
                      className="w-full px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-between gap-1 h-[28px]"
                    >
                      <span className="truncate">ℹ️ {(() => {
                        if (mobileTab === 'toada') {
                          if (activeRightPanel === 'info') return lang === 'pt' ? 'Informações' : 'Informations';
                          if (activeRightPanel === 'letras') return 'Toada';
                          if (activeRightPanel === 'sinais') return lang === 'pt' ? 'Sinais' : 'Signes';
                          if (activeRightPanel === 'legend') return lang === 'pt' ? 'Legenda' : 'Légende';
                          if (activeRightPanel === 'feedback') return lang === 'pt' ? 'Nota & Opinião' : 'Note & Avis';
                        }
                        return lang === 'pt' ? 'Informações' : 'Information';
                      })()}</span>
                      <span className="text-[10px] shrink-0">▼</span>
                    </button>
                    
                    {infoDropOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] z-[100] flex flex-col py-1">
                        <button
                          onClick={() => { onToggleRightPanel('info'); onMobileTabToggle?.('toada'); setInfoDropOpen(false); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                            mobileTab === 'toada' && activeRightPanel === 'info' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                          }`}
                        >
                          ℹ️ {lang === 'pt' ? 'Informações' : 'Informations'}
                        </button>
                        <button
                          onClick={() => { onToggleRightPanel('letras'); onMobileTabToggle?.('toada'); setInfoDropOpen(false); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                            mobileTab === 'toada' && activeRightPanel === 'letras' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                          }`}
                        >
                          📝 Toada
                        </button>
                        <button
                          onClick={() => { onToggleRightPanel('sinais'); onMobileTabToggle?.('toada'); setInfoDropOpen(false); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                            mobileTab === 'toada' && activeRightPanel === 'sinais' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                          }`}
                        >
                          🖐️ {lang === 'pt' ? 'Sinais' : 'Signes'}
                        </button>
                        <button
                          onClick={() => { onToggleRightPanel('legend'); onMobileTabToggle?.('toada'); setInfoDropOpen(false); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                            mobileTab === 'toada' && activeRightPanel === 'legend' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                          }`}
                        >
                          📖 {lang === 'pt' ? 'Legenda' : 'Légende'}
                        </button>
                        <button
                          onClick={() => { onToggleRightPanel('feedback'); onMobileTabToggle?.('toada'); setInfoDropOpen(false); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                            mobileTab === 'toada' && activeRightPanel === 'feedback' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                          }`}
                        >
                          💬 {lang === 'pt' ? 'Nota & Opinião' : 'Note & Avis'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Atelier button for mobile / tablet */}
                  <button
                    onClick={() => { toggleSettings(); setMobileMenuOpen(false); }}
                    className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-center gap-1 col-span-2"
                  >
                    ⚙️ {lang === 'fr' ? "L'Atelier" : 'A Oficina'}
                  </button>
                </div>
              </div>

              {/* ❓ AIDE & COMMUNAUTÉ */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  ❓ {lang === 'pt' ? 'Ajuda & Comunidade' : 'Aide & Communauté'}
                </span>
                
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1 transition-colors">
                    🎥 Tuto
                  </button>
                  <button onClick={() => { window.open('/tutorial.html', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1 transition-colors">
                    📖 Guide
                  </button>
                  <button onClick={() => { onToggleRightPanel('feedback'); onMobileTabToggle?.('toada'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1 transition-colors">
                    💬 {t('feedbackBtn')}
                  </button>
                  <button onClick={() => {
                    handleShareApp();
                    setMobileMenuOpen(false);
                  }} className="px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-center gap-1 transition-colors">
                    <Share2 className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Compartilhar o App' : "Partager l'application"}
                  </button>
                </div>
              </div>

              {/* Eco Mode Toggle */}
              <div className="flex flex-col gap-1 border-t border-[var(--cordel-text)] pt-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-[var(--cordel-text)]">
                  <input
                    type="checkbox"
                    checked={ecoMode}
                    onChange={toggleEcoMode}
                    className="accent-[var(--cordel-text)] w-4 h-4 cursor-pointer"
                  />
                  🌱 Mode Éco {ecoMode ? '(On)' : '(Off)'}
                </label>
                <div className="text-xs opacity-80 leading-tight text-[var(--cordel-text)] font-sans">
                  {lang === 'fr' 
                    ? 'Désactive les animations pour soulager la tablette.'
                    : 'Desativa animações para aliviar o tablet.'}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Center: App Title */}
        <div className="flex flex-col items-end select-none cursor-default">
          <span id="header-title-text-mobile" className="font-cactus text-[var(--cordel-text)] text-base font-bold tracking-wide uppercase whitespace-nowrap leading-none mt-1">
            O Girador
          </span>
          <span className="text-[8px] font-bold font-sans uppercase tracking-widest opacity-80 leading-none mt-0 text-[var(--cordel-wood)]">
            Sequenciador
          </span>
        </div>

        {/* Right: Quick actions (View Switcher and Add Instrument) */}
        <div className="flex items-center gap-2">
          {/* RODA */}
          <button
            onClick={() => {
              onViewModeToggle('roda');
              if (onMobileTabToggle) onMobileTabToggle('roda');
            }}
            className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
              viewMode === 'roda' && mobileTab === 'roda'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Roda"
          >
            <XiloRoda size={16} />
          </button>

          {/* MIXADOR (MOBILE ONLY TRACK MIXER / DAW LINEAIRE) */}
          {isMobile && (
            <button
              onClick={() => {
                onViewModeToggle('roda');
                if (onMobileTabToggle) onMobileTabToggle('mixer');
                useSequencerStore.setState({ isTracksCollapsed: false });
              }}
              className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
                viewMode === 'roda' && mobileTab === 'mixer'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title={lang === 'fr' ? 'Pistes / Séquenceur' : 'Pistas / Sequenciador'}
            >
              <XiloDrum size={16} />
            </button>
          )}

          {/* CONSOLE */}
          <button
            onClick={() => onViewModeToggle('console')}
            className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
              viewMode === 'console'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Console"
          >
            <XiloConsole size={16} />
          </button>

          {/* TIMELINE */}
          <button
            onClick={() => onViewModeToggle('timeline')}
            className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title={lang === 'fr' ? 'Séquenceur' : 'Sequenciador'}
          >
            <XiloTimeline size={16} />
          </button>
        </div>
      </div>
      </>
    );
  }

  return (
    <div
      id="top-bar"
      className="w-full min-h-[70px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-5 py-2.5 gap-2 z-50 relative select-none shrink-0"
    >
      <div className="flex-1 flex items-center gap-3">
        <div className="flex items-start select-none cursor-default">
          <div className="flex flex-col items-end">
            <span
              id="header-title-text"
              className="font-cactus text-[var(--cordel-text)] text-3xl font-medium tracking-widest uppercase leading-none"
            >
              O Girador
            </span>
            <span className="text-[10px] font-bold font-sans uppercase tracking-[0.2em] opacity-80 leading-none mt-0 text-[var(--cordel-wood)]">
              Sequenciador
            </span>
          </div>
          {version && <span className="text-xs lowercase opacity-50 ml-1 font-sans pt-1">v{version}</span>}
        </div>
        
        <div className="relative ml-2" ref={projectDropRef}>
          <button
            onClick={() => setProjectDropOpen(!projectDropOpen)}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-1.5 font-bold font-cactus uppercase cursor-pointer flex items-center gap-2"
          >
            {lang === 'pt' ? 'Menu' : 'Menu'} <span className="text-[10px]">▼</span>
          </button>
          
          {projectDropOpen && (
            <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] w-[280px] z-[100] flex flex-col p-2 gap-3">
              {/* 👤 PERFIL */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  👤 {lang === 'pt' ? 'Perfil' : 'Profil'}
                </span>
                <div className="flex items-center gap-2">
                  <GoogleLoginButton lang={lang} onAdminClick={onAdminClick} align="left" />
                  <button onClick={() => { sequencer.setIsLeftHanded(!sequencer.isLeftHanded); setProjectDropOpen(false); }} className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer flex-1 ${sequencer.isLeftHanded ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}>
                    🫲 {lang === 'pt' ? 'Canhoto' : 'Gaucher'}
                  </button>
                </div>
                <button 
                  onClick={() => { setIsSwingModalOpen(true); setProjectDropOpen(false); }} 
                  className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer flex justify-between items-center w-full mt-1 ${globalSwing.mode !== 'off' ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[14px] leading-none">〰️</span> {lang === 'pt' ? 'Balanço' : 'Swing'}
                  </div>
                  <span>{globalSwing.mode === 'off' ? 'OFF' : globalSwing.mode === 'maracatu' ? 'ON' : 'CUST'}</span>
                </button>
              </div>
              
              {/* PROJET */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  📂 {lang === 'pt' ? 'Projeto' : 'Projet'}
                </span>
                
                {/* Presets Selector */}
                <PresetAccordionSelector
                  lang={lang}
                  activePreset={preset}
                  currentSongTitle={metadata?.toada}
                  publicCloudPresets={publicCloudPresets}
                  privateCloudPresets={privateCloudPresets}
                  localPresets={localPresets}
                  isCloudPresetsLoading={isCloudPresetsLoading}
                  showGroupCatalogue={showGroupCatalogue}
                  groupLabel={groupLabel}
                  onSelectPreset={(val) => {
                    onPresetChange(val);
                    setProjectDropOpen(false);
                  }}
                />

                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => { onClear(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" /> {t('clear')}
                  </button>
                  <button onClick={() => { onExportTablature?.(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full">
                    <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Tablatura' : 'Tablature'}
                  </button>
                  <button onClick={() => { onCloudSave?.(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full col-span-2 mt-1 border-none transition-colors">
                    <Save className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Salvar (Cloud)' : 'Sauvegarder (Cloud)'}
                  </button>
                  {(isAdmin || userProfile?.role === 'mestre') && (
                    <div className="col-span-2 mt-1">
                      <BoutonExportDanse />
                    </div>
                  )}
                </div>
              </div>

              {/* AIDE & COMMUNAUTÉ */}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[var(--cordel-border)]/30">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  ❓ {lang === 'pt' ? 'Ajuda & Comunidade' : 'Aide & Communauté'}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => { window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer w-full transition-colors">
                    <Video className="w-3.5 h-3.5 shrink-0" /> Tuto
                  </button>
                  <button onClick={() => { window.open('/tutorial.html', '_blank'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer w-full">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" /> Guide
                  </button>
                  <button onClick={() => { onToggleRightPanel('feedback'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer w-full transition-colors">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" /> {t('feedbackBtn')}
                  </button>
                  <button onClick={() => { handleShareApp(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full border-none transition-colors">
                    <Share2 className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Compartilhar o App' : "Partager l'application"}
                  </button>
                </div>
              </div>

              {/* Eco Mode Toggle */}
              <div className="flex flex-col gap-1 border-t border-[var(--cordel-border)]/30 pt-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-[var(--cordel-text)]">
                  <input
                    type="checkbox"
                    checked={ecoMode}
                    onChange={toggleEcoMode}
                    className="accent-[var(--cordel-text)] w-4 h-4 cursor-pointer"
                  />
                  🌱 Mode Éco {ecoMode ? '(On)' : '(Off)'}
                </label>
                <div className="text-[10px] opacity-80 leading-tight text-[var(--cordel-text)] font-sans">
                  {lang === 'fr' 
                    ? 'Désactive les animations pour soulager le PC.'
                    : 'Desativa animações para aliviar o PC.'}
                </div>
              </div>

            </div>
          )}
        </div>



        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button w-[34px] h-[34px] flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-1.5 shrink-0"
          title={lang === 'pt' ? 'Desfazer (Ctrl+Z)' : 'Annuler (Ctrl+Z)'}
        >
          <UndoIcon className="w-5 h-5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button w-[34px] h-[34px] flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-1.5 shrink-0"
          title={lang === 'pt' ? 'Refazer (Ctrl+Y)' : 'Rétablir (Ctrl+Y)'}
        >
          <RedoIcon className="w-5 h-5" />
        </button>
      </div>

      {/* CENTER: Main Core Actions */}
      <div className="flex items-center justify-center gap-4">
        {/* RODA */}
        <div className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
          <button
            onClick={() => {
              onViewModeToggle('roda');
              useSequencerStore.setState({ isTracksCollapsed: true });
            }}
            className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              viewMode === 'roda' && isTracksCollapsed
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
            title={lang === 'fr' ? 'Vue Roda / Séquenceur circulaire' : 'Visão Roda / Sequenciador circular'}
          >
            <XiloRoda size={14} className="shrink-0" /> RODA
          </button>
          <button
            onClick={() => useSequencerStore.getState().toggleCircleSequencerDetached()}
            className="flex items-center justify-center px-2 border-l-2 border-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer h-full"
            title={lang === 'fr' ? 'Détacher' : 'Separar'}
          >
            <ExternalLink size={14} />
          </button>
        </div>

        {/* PISTES / DAW LINEAIRE */}
        <div className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
          <button
            onClick={() => {
              onViewModeToggle('roda');
              useSequencerStore.setState({ isTracksCollapsed: false });
            }}
            className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              viewMode === 'roda' && !isTracksCollapsed
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
            title={lang === 'fr' ? 'Vue Pistes / Séquenceur linéaire' : 'Visão Pistas / Sequenciador linear'}
          >
            <XiloDrum size={14} className="shrink-0" /> {lang === 'fr' ? 'PISTES' : 'PISTAS'}
          </button>
          <button
            onClick={() => useSequencerStore.getState().toggleLinearDawDetached()}
            className="flex items-center justify-center px-2 border-l-2 border-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer h-full"
            title={lang === 'fr' ? 'Détacher' : 'Separar'}
          >
            <ExternalLink size={14} />
          </button>
        </div>

        {/* MIXER */}
        <div className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
          <button
            onClick={() => onViewModeToggle('console')}
            className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              viewMode === 'console'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
            title="Vue Console / Mixeur vertical"
          >
            <XiloConsole size={14} className="shrink-0" /> {lang === 'fr' ? 'MIXEUR' : 'MIXADOR'}
          </button>
          <button
            onClick={() => useSequencerStore.getState().toggleConsoleDetached()}
            className="flex items-center justify-center px-2 border-l-2 border-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer h-full"
            title={lang === 'fr' ? 'Détacher' : 'Separar'}
          >
            <ExternalLink size={14} />
          </button>
        </div>

        {/* TIMELINE */}
        <div className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
          <button
            onClick={() => onViewModeToggle('timeline')}
            className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              viewMode === 'timeline'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
            title={lang === 'fr' ? 'Vue Séquenceur / Ligne temporelle' : 'Visualização do Sequenciador / Linha do tempo'}
          >
            <XiloTimeline size={14} className="shrink-0" /> {lang === 'fr' ? 'SÉQUENCEUR' : 'SEQUENCIADOR'}
          </button>
          <button
            onClick={() => useSequencerStore.getState().toggleTimelineDetached()}
            className="flex items-center justify-center px-2 border-l-2 border-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer h-full"
            title={lang === 'fr' ? 'Détacher' : 'Separar'}
          >
            <ExternalLink size={14} />
          </button>
        </div>

        {/* ÉDITEUR */}
        <div className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
          <button
            onClick={() => onOpenInstrumentEditor?.()}
            className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
              editingTrackId !== null && !isInstrumentEditorDetached
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
            title={lang === 'fr' ? "Éditeur d'instrument détaillé" : "Editor de instrumento detalhado"}
          >
            <Edit3 size={14} className="shrink-0" /> {lang === 'fr' ? 'ÉDITEUR' : 'EDITOR'}
          </button>
          <button
            onClick={() => onToggleDetachInstrumentEditor ? onToggleDetachInstrumentEditor() : useSequencerStore.getState().toggleInstrumentEditorDetached()}
            className={`flex items-center justify-center px-2 border-l-2 border-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer h-full ${
              isInstrumentEditorDetached ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : ''
            }`}
            title={lang === 'fr' ? 'Détacher' : 'Separar'}
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* RIGHT: Auxiliary */}
      <div className="flex-1 flex items-center justify-end flex-wrap gap-2.5">
        {showInstallButton && onInstallClick && (
          <button
            onClick={onInstallClick}
            className="bg-[#e67e22] text-[#1a1a1a] hover:opacity-90 px-3 h-[34px] text-xs font-bold font-cactus uppercase cordel-border-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title={lang === 'pt' ? 'Instalar App' : "Installer l'app"}
          >
            <Download className="w-4 h-4" /> {lang === 'pt' ? 'Instalar' : 'Installer'}
          </button>
        )}
        <button
          onClick={onToggleDarkMode}
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-12 h-[34px] flex items-center justify-center cursor-pointer shrink-0"
          title="Dark / Light Mode"
        >
          {isDarkMode ? <XiloSun size={18} className="shrink-0" /> : <XiloMoon size={16} className="shrink-0" />}
        </button>

        <button
          onClick={onLangToggle}
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-12 h-[34px] flex items-center justify-center font-bold text-xs cursor-pointer shrink-0"
          title="Changer de langue / Mudar idioma"
        >
          {lang === 'pt' ? 'FR' : 'PT'}
        </button>

        <div 
          className="flex items-center gap-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-button px-3 h-[34px] cursor-pointer hover:bg-[#1a1a1a]/5 transition-colors select-none shrink-0" 
          onClick={toggleSettings}
          title="A Oficina (Settings)"
        >
          <MiniTelemetryBadge />
          <span className="text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2L14 5H10L12 2Z" />
              <path d="M12 22L10 19H14L12 22Z" />
              <path d="M22 12L19 14V10L22 12Z" />
              <path d="M2 12L5 10V14L2 12Z" />
              <path d="M19.07 4.93L16.24 7.76L17.66 9.17L20.49 6.34L19.07 4.93Z" />
              <path d="M4.93 19.07L7.76 16.24L9.17 17.66L6.34 20.49L4.93 19.07Z" />
              <path d="M19.07 19.07L16.24 16.24L17.66 14.83L20.49 17.66L19.07 19.07Z" />
              <path d="M4.93 4.93L7.76 7.76L9.17 6.34L6.34 3.51L4.93 4.93Z" />
            </svg>
            <span>{lang === 'pt' ? 'A Oficina' : 'A Oficina'}</span>
          </span>
        </div>
      </div>

      {/* Global Swing Modal */}
      {isSwingModalOpen && (
        <GlobalSwingModal
          globalSwing={globalSwing}
          setGlobalSwing={setGlobalSwing}
          onClose={() => setIsSwingModalOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
};

export const Header = React.memo(HeaderComponent);
