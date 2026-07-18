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
  Upload
} from 'lucide-react';
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
import { XiloRoda, XiloConsole, XiloTimeline, XiloMestre, XiloGame, XiloSun, XiloMoon, XiloDrum } from './XiloIcons';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { MiniTelemetryBadge } from './TelemetryBadge';
import { useWizardStore } from '../stores/useWizardStore';

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
  cloudPresets?: { id: string; name: string }[];

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
}

const HeaderComponent: React.FC<HeaderProps> = ({
  presetFiles = [],
  localPresets = [],
  cloudPresets = [],

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
}) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { hasAccess, userProfile, isAdmin } = useAuth();
  const toggleSettings = useSequencerSettingsStore((state) => state.toggleSettings);

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
    handleSaveState: onSave,
    handleLoadState: onLoad,
    handleShare: onShare,
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

  const [jogoDropOpen, setJogoDropOpen] = useState(false);
  const jogoDropRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use a ref to always have the latest onLoad callback, bypassing React.memo stale closure issue
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [infoDropOpen, setInfoDropOpen] = useState(false);
  const infoDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setProjectDropOpen(false);
      }
      if (jogoDropOpen && jogoDropRef.current && !jogoDropRef.current.contains(e.target as Node)) {
        setJogoDropOpen(false);
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
  }, [jogoDropOpen]);

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
                  <GoogleLoginButton lang={lang} onAdminClick={onAdminClick} />
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
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] font-bold text-[var(--cordel-text)]/60 uppercase tracking-wider">Presets</span>
                  <select
                    value={preset}
                    onChange={(e) => { onPresetChange(e.target.value); setMobileMenuOpen(false); }}
                    className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-xs font-bold p-1.5 cordel-border-sm outline-none cursor-pointer mb-1"
                  >
                    <option value="" disabled>
                      {metadata?.toada || (lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme')}
                    </option>
                    
                    <optgroup label={lang === 'pt' ? 'Catálogo O Girador' : 'Catalogue O Girador'}>
                      {presetFiles.map((file) => {
                        let label = file.replace(/\.json$/, '');
                        if (label.startsWith('_')) label = label.substring(1);
                        label = label.replace(/_/g, ' ');
                        return (
                          <option key={file} value={file} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
                            {label}
                          </option>
                        );
                      })}
                    </optgroup>

                    {cloudPresets.length > 0 && (
                      <optgroup label={lang === 'pt' ? 'Catálogo Cloud' : 'Catalogue Cloud'}>
                        {cloudPresets.map((p) => (
                          <option key={`cloud:${p.id}`} value={`cloud:${p.id}`} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[#2980b9]">
                            ☁️ {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {localPresets.length > 0 && (
                      <optgroup label={lang === 'pt' ? 'Meus Presets' : 'Mes Presets'}>
                        {localPresets.map((name) => (
                          <option key={`local:${name}`} value={`local:${name}`} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
                            💾 {name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

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
                  {isAdmin && (
                    <button onClick={() => { fileInputRef.current?.click(); setMobileMenuOpen(false); }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full">
                      <Upload className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Importar' : 'Importer'}
                    </button>
                  )}
                  <button onClick={() => { onSave(); setMobileMenuOpen(false); }} className={`flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full ${!isAdmin ? 'col-span-2' : ''}`}>
                    <Save className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Salvar' : 'Sauvegarder'}
                  </button>
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
                  <button onClick={() => { window.open('tutorial.html', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1 transition-colors">
                    📖 Guide
                  </button>
                  <button onClick={() => { onToggleRightPanel('feedback'); onMobileTabToggle?.('toada'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1 transition-colors">
                    💬 {t('feedbackBtn')}
                  </button>
                  <button onClick={() => {
                    if (onShare) {
                      onShare();
                    }
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
        <span id="header-title-text-mobile" className="font-cactus text-[var(--cordel-text)] text-base font-bold tracking-wide uppercase select-none cursor-default whitespace-nowrap">
          O Girador
        </span>

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

          {/* MIXADOR (MOBILE ONLY TRACK MIXER) */}
          {isMobile && (
            <button
              onClick={() => {
                onViewModeToggle('roda');
                if (onMobileTabToggle) onMobileTabToggle('mixer');
              }}
              className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
                viewMode === 'roda' && mobileTab === 'mixer'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title="Mixador (Instruments)"
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

          {/* STUDIO DO MESTRE (Mobile) */}
          {hasAccess('admin') && (
            <button
              onClick={() => onViewModeToggle('studio')}
              className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
                viewMode === 'studio'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title={lang === 'pt' ? 'Estúdio do Mestre' : 'Studio du Mestre'}
            >
              <XiloMestre size={16} />
            </button>
          )}

          {/* JOGO DROPDOWN (MOBILE) */}
          {hasAccess('admin') && (
            <div className="relative font-sans" ref={jogoDropRef}>
              <button
                onClick={() => setJogoDropOpen(!jogoDropOpen)}
                className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
                  viewMode === 'quiz' || viewMode === 'dictee' || viewMode === 'inspecteur' || viewMode === 'mestre' || viewMode === 'rythmelive'
                    ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                }`}
                title={lang === 'pt' ? 'Jogos' : 'Jeux'}
              >
                <XiloGame size={16} />
              </button>
              
              {jogoDropOpen && (
              <div className="absolute top-10 right-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[160px] z-[100] flex flex-col py-1">
                <button
                  onClick={() => { onViewModeToggle('varal'); setJogoDropOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                    viewMode === 'varal' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                  }`}
                >
                  🪢 {lang === 'pt' ? 'Varal (Progresso)' : 'Varal (Progression)'}
                </button>
              </div>
            )}
          </div>
        )}


        </div>

      </div>
      {/* File input always in DOM so fileInputRef.current is never null */}
      <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoadRef.current(f); e.target.value = ''; }} />
      </>
    );
  }

  return (
    <div
      id="top-bar"
      className="w-full min-h-[70px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-5 py-2.5 gap-2 z-50 relative select-none shrink-0"
    >
      <div className="flex-1 flex items-center gap-3">

        <span
          id="header-title-text"
          className="font-cactus text-[var(--cordel-text)] text-3xl font-medium tracking-widest uppercase select-none cursor-default"
        >
          O Girador {version && <span className="text-xs lowercase opacity-50 ml-1 font-sans">v{version}</span>}
        </span>
        
        <div className="relative ml-2" ref={projectDropRef}>
          <button
            onClick={() => setProjectDropOpen(!projectDropOpen)}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-1.5 font-bold font-cactus uppercase cursor-pointer flex items-center gap-2"
          >
            {lang === 'pt' ? 'Menu' : 'Menu'} <span className="text-[10px]">▼</span>
          </button>
          
          {projectDropOpen && (
            <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[250px] z-[100] flex flex-col p-2 gap-3">
              {/* 👤 PERFIL */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  👤 {lang === 'pt' ? 'Perfil' : 'Profil'}
                </span>
                <div className="flex items-center gap-2">
                  <GoogleLoginButton lang={lang} onAdminClick={onAdminClick} />
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
                <select
                  value={preset}
                  onChange={(e) => { onPresetChange(e.target.value); setProjectDropOpen(false); }}
                  className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-xs font-bold p-1.5 cordel-border-sm outline-none cursor-pointer mb-1"
                >
                  <option value="" disabled>
                    {metadata?.toada || (lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme')}
                  </option>
                  
                  <optgroup label={lang === 'pt' ? 'Catálogo O Girador' : 'Catalogue O Girador'}>
                    {presetFiles.map((file) => {
                      let label = file.replace(/\.json$/, '');
                      if (label.startsWith('_')) label = label.substring(1);
                      label = label.replace(/_/g, ' ');
                      return (
                        <option key={file} value={file} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
                          {label}
                        </option>
                      );
                    })}
                  </optgroup>

                  {cloudPresets.length > 0 && (
                    <optgroup label={lang === 'pt' ? 'Catálogo Cloud' : 'Catalogue Cloud'}>
                      {cloudPresets.map((p) => (
                        <option key={`cloud:${p.id}`} value={`cloud:${p.id}`} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[#2980b9]">
                          ☁️ {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {localPresets.length > 0 && (
                    <optgroup label={lang === 'pt' ? 'Meus Presets' : 'Mes Presets'}>
                      {localPresets.map((name) => (
                        <option key={`local:${name}`} value={`local:${name}`} className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">
                          💾 {name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => { onClear(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" /> {t('clear')}
                  </button>
                  <button onClick={() => { onExportTablature?.(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full">
                    <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Tablatura' : 'Tablature'}
                  </button>
                  {isAdmin && (
                    <button onClick={() => { fileInputRef.current?.click(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full">
                      <Upload className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Importar' : 'Importer'}
                    </button>
                  )}
                  <button onClick={() => { onSave(); setProjectDropOpen(false); }} className={`flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full ${!isAdmin ? 'col-span-2' : ''}`}>
                    <Save className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Salvar' : 'Sauvegarder'}
                  </button>
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
                  <button onClick={() => { window.open('tutorial.html', '_blank'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer w-full">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" /> Guide
                  </button>
                  <button onClick={() => { onToggleRightPanel('feedback'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer w-full transition-colors">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" /> {t('feedbackBtn')}
                  </button>
                  <button onClick={() => { if (onShare) onShare(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full border-none transition-colors">
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

        {/* File input always in DOM so fileInputRef.current is never null */}
        <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoadRef.current(f); e.target.value = ''; }} />



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
        <button
          onClick={() => onViewModeToggle('roda')}
          className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
            viewMode === 'roda'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title="Vue Roda / Séquenceur circulaire"
        >
          <XiloRoda size={14} className="shrink-0" /> RODA
        </button>

        {/* MIXER */}
        <button
          onClick={() => onViewModeToggle('console')}
          className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
            viewMode === 'console'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title="Vue Console / Mixeur vertical"
        >
          <XiloConsole size={14} className="shrink-0" /> {lang === 'fr' ? 'MIXEUR' : 'MIXADOR'}
        </button>

        {/* TIMELINE */}
        <button
          onClick={() => onViewModeToggle('timeline')}
          className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
            viewMode === 'timeline'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title={lang === 'fr' ? 'Vue Séquenceur / Ligne temporelle' : 'Visualização do Sequenciador / Linha do tempo'}
        >
          <XiloTimeline size={14} className="shrink-0" /> {lang === 'fr' ? 'SÉQUENCEUR' : 'SEQUENCIADOR'}
        </button>

        {/* STUDIO DO MESTRE (Standalone Desktop) */}
        {hasAccess('admin') && (
          <button
            onClick={() => onViewModeToggle('studio')}
            className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
              viewMode === 'studio'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title={lang === 'pt' ? 'Estúdio do Mestre' : 'Studio du Mestre'}
          >
            <XiloMestre size={14} className="shrink-0" /> {lang === 'pt' ? 'ESTÚDIO' : 'STUDIO'}
          </button>
        )}

        {/* JOGOS DROPDOWN (DESKTOP) */}
        <div className="relative font-sans" ref={jogoDropRef}>
          {hasAccess('admin') && (
            <button
              onClick={() => setJogoDropOpen(!jogoDropOpen)}
              className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
                viewMode === 'quiz' || viewMode === 'dictee' || viewMode === 'inspecteur' || viewMode === 'mestre' || viewMode === 'rythmelive'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title={lang === 'pt' ? 'Jogos' : 'Jeux'}
            >
              <XiloGame size={14} className="shrink-0" /> {lang === 'pt' ? 'JOGOS' : 'JEUX'} <span className="text-[10px] ml-1">▼</span>
            </button>
          )}
          
          {jogoDropOpen && hasAccess('admin') && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[200px] z-[100] flex flex-col py-1">
              <button
                onClick={() => { onViewModeToggle('varal'); setJogoDropOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors cursor-pointer text-xs ${
                  viewMode === 'varal' ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-wood)] font-black' : 'text-[var(--cordel-text)]'
                }`}
              >
                🪢 {lang === 'pt' ? 'Varal (Progresso)' : 'Varal (Progression)'}
              </button>
            </div>
          )}
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
