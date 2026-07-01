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

interface HeaderProps {
  presetFiles: string[];
  localPresets: string[];
  cloudPresets?: { id: string; name: string }[];

  viewMode: 'roda' | 'console' | 'timeline';
  onViewModeToggle: (mode: 'roda' | 'console' | 'timeline') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMobile: boolean;
  mobileTab?: 'roda' | 'mixer' | 'toada';
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  activeRightPanel?: 'legend' | 'letras' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras') => void;
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
  const { hasAccess, userProfile } = useAuth();

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

  const {
    activePresetName: preset,
    handlePresetSelect: onPresetChange,
    handleSaveState: onSave,
    handleLoadState: onLoad,
    handleShare: onShare,
    handleSaveToLocal: onSaveToLocal,
    handleLoadLocalPreset: onLoadLocalPreset,
    globalSwing,
    setGlobalSwing,
    masterVol,
    setMasterVol,
    handleTimeSigChange: onTimeSigChange,
  } = audio;

  const onLangToggle = () => setLang(lang === 'pt' ? 'fr' : 'pt');
  const onClear = handleClear;
  const onAddInstrument = handleAddTrackInstrument;
  const onUndo = handleUndo;
  const canUndo = tracksHistory.length > 0;
  const onRedo = handleRedo;
  const canRedo = tracksRedoHistory.length > 0;
  const [isSwingModalOpen, setIsSwingModalOpen] = useState(false);
  const onMasterVolChange = setMasterVol;
  const onTotalMeasuresChange = setTotalMeasures;

  // --- ECO MODE ---
  const [ecoMode, setEcoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('o-girador-eco-mode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Auto-détection (Smart Default) pour appareils modestes
    const isTouch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const ram = (navigator as any).deviceMemory || 8;
    
    // Si c'est un appareil tactile avec RAM <= 6Go, on active le mode éco d'office
    if (isTouch && ram <= 6) {
      return true;
    }
    
    return false;
  });

  const toggleEcoMode = () => {
    const newMode = !ecoMode;
    setEcoMode(newMode);
    localStorage.setItem('o-girador-eco-mode', String(newMode));
    (window as any).oGiradorEcoMode = newMode;
    window.dispatchEvent(new Event('eco-mode-changed'));
  };

  useEffect(() => {
    (window as any).oGiradorEcoMode = ecoMode;
    document.body.classList.toggle('eco-mode', ecoMode);
    window.dispatchEvent(new Event('eco-mode-changed'));
  }, [ecoMode]);
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
                    className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-xs font-bold p-1.5 cordel-border-sm outline-none cursor-pointer"
                  >
                    <option value="" disabled>{lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme'}</option>
                    
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
                    if (onShare) {
                      onShare();
                    }
                    setMobileMenuOpen(false);
                  }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full">
                    <Share2 className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Compartilhar' : 'Partager'}
                  </button>
                  {userProfile?.role === 'admin' && (
                    <button onClick={() => { fileInputRef.current?.click(); setMobileMenuOpen(false); }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full">
                      <Upload className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Importar' : 'Importer'}
                    </button>
                  )}
                  <button onClick={() => { onSave(); setMobileMenuOpen(false); }} className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full">
                    <Save className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Salvar' : 'Sauvegarder'}
                  </button>
                  <button onClick={() => { onExportTablature?.(); setMobileMenuOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-center w-full col-span-2">
                    <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'fr' ? 'Exporter Partition (TAB)' : 'Exportar Partitura (TAB)'}
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
                    ↩️ {lang === 'pt' ? 'Desfazer' : 'Annuler'}
                  </button>
                  <button onClick={() => { onRedo(); setMobileMenuOpen(false); }} disabled={!canRedo} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1">
                    ↪️ {lang === 'pt' ? 'Refazer' : 'Rétablir'}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-cactus font-bold text-[var(--cordel-text)]">Mesures</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTotalMeasuresChange(Math.max(1, totalMeasures - 1))}
                      className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                    >-</button>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={totalMeasures}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(64, parseInt(e.target.value) || 1));
                        onTotalMeasuresChange(val);
                      }}
                      className="w-10 text-center bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none border border-[var(--cordel-border)] rounded-sm"
                      style={{ height: '24px' }}
                    />
                    <button
                      onClick={() => onTotalMeasuresChange(Math.min(64, totalMeasures + 1))}
                      className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                    >+</button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-cactus font-bold text-[var(--cordel-text)]">{t('tsLabel')}</span>
                  <select
                    value={timeSig}
                    onChange={(e) => onTimeSigChange(e.target.value as any)}
                    className="bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none cursor-pointer cordel-border-sm px-1.5 py-0.5"
                  >
                    <option value="4/4" className="bg-[var(--cordel-bg)]">4/4</option>
                    <option value="3/4" className="bg-[var(--cordel-bg)]">3/4</option>
                    <option value="2/4" className="bg-[var(--cordel-bg)]">2/4</option>
                    <option value="6/8" className="bg-[var(--cordel-bg)]">6/8</option>
                    <option value="12/8" className="bg-[var(--cordel-bg)]">12/8</option>
                  </select>
                </div>
              </div>

              {/* 🎛️ OPTIONS AUDIO */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  🎛️ {lang === 'pt' ? 'Áudio' : 'Audio'}
                </span>
                
                {/* Master Volume */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] font-bold text-[var(--cordel-text)]/60 uppercase tracking-wider">Volume Général</span>
                  <AudioFader
                    type="range"
                    min="-40"
                    max="6"
                    step="0.5"
                    audioTarget="masterVolume"
                    value={masterVol}
                    onChange={(val) => onMasterVolChange(val)}
                    className="w-full h-2 bg-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none outline-none cursor-pointer"
                    style={{ accentColor: 'var(--cordel-text)' }}
                  />
                </div>

                </div>

              {/* 👁️ AFFICHAGE & LANGUE */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  👁️ {lang === 'pt' ? 'Visualização & Idioma' : 'Affichage & Langue'}
                </span>
                
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { onToggleDarkMode(); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    {isDarkMode ? '🌞 Light' : '🌙 Dark'}
                  </button>
                  <button onClick={() => { onLangToggle(); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    🌐 {lang === 'pt' ? 'FR' : 'PT'}
                  </button>
                  <button onClick={() => { onToggleRightPanel('legend'); setMobileMenuOpen(false); }} className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer ${activeRightPanel === 'legend' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'}`}>
                    📖 {t('legend')}
                  </button>
                  <button onClick={() => { onToggleRightPanel('letras'); setMobileMenuOpen(false); }} className={`px-2 py-1.5 cordel-border-sm text-xs font-bold font-cactus cursor-pointer ${activeRightPanel === 'letras' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'}`}>
                    📝 TOADA
                  </button>

                </div>
              </div>

              {/* ❓ AIDE & COMMUNAUTÉ */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  ❓ {lang === 'pt' ? 'Ajuda & Comunidade' : 'Aide & Communauté'}
                </span>
                
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[#e67e22] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer flex items-center justify-center gap-1">
                    🎥 Tuto
                  </button>
                  <button onClick={() => { window.open('tutorial.html', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[#8e44ad] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer flex items-center justify-center gap-1">
                    📖 Guide
                  </button>
                  <button onClick={() => { window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1.5 bg-[#27ae60] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer col-span-2 flex items-center justify-center gap-1">
                    💬 {t('feedbackBtn')}
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
            ⭕
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
              🥁
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
            🎚️
          </button>

          {/* TIMELINE */}
          <button
            onClick={() => onViewModeToggle('timeline')}
            className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title={lang === 'fr' ? 'Séquence' : 'Sequência'}
          >
            🎞️
          </button>

          {/* STUDIO DO MESTRE (Mobile) */}
          {hasAccess('mestre') && (
            <button
              onClick={() => onViewModeToggle('studio')}
              className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
                viewMode === 'studio'
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
              title={lang === 'pt' ? 'Estúdio do Mestre' : 'Studio du Mestre'}
            >
              👑
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
                🎮
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
          className="font-cactus text-[var(--cordel-text)] text-3xl font-medium tracking-widest uppercase select-none cursor-default drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
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
                  <option value="" disabled>{lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme'}</option>
                  
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
                  <button onClick={() => { if (onShare) onShare(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#2980b9] text-[#1a1a1a] cordel-border-sm text-[10px] font-bold font-cactus hover:opacity-90 cursor-pointer w-full border-none">
                    <Share2 className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Compartilhar' : 'Partager'}
                  </button>
                  {userProfile?.role === 'admin' && (
                    <button onClick={() => { fileInputRef.current?.click(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full">
                      <Upload className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Importar' : 'Importer'}
                    </button>
                  )}
                  <button onClick={() => { onSave(); setProjectDropOpen(false); }} className={`flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full ${userProfile?.role !== 'admin' ? 'col-span-2' : ''}`}>
                    <Save className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Salvar' : 'Sauvegarder'}
                  </button>
                  <button onClick={() => { onExportTablature?.(); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[10px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full col-span-2">
                    <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Exportar Partitura (TAB)' : 'Exporter Partition (TAB)'}
                  </button>
                </div>
              </div>

              {/* AIDE & COMMUNAUTÉ */}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[var(--cordel-border)]/30">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide flex items-center gap-1">
                  ❓ {lang === 'pt' ? 'Ajuda & Comunidade' : 'Aide & Communauté'}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => { window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#e67e22] text-[#1a1a1a] cordel-border-sm text-[10px] font-bold font-cactus hover:opacity-90 cursor-pointer w-full">
                    <Video className="w-3.5 h-3.5 shrink-0" /> Tuto
                  </button>
                  <button onClick={() => { window.open('tutorial.html', '_blank'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#8e44ad] text-[#1a1a1a] cordel-border-sm text-[10px] font-bold font-cactus hover:opacity-90 cursor-pointer w-full">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" /> Guide
                  </button>
                  <button onClick={() => { window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank'); setProjectDropOpen(false); }} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#27ae60] text-[#1a1a1a] cordel-border-sm text-[10px] font-bold font-cactus hover:opacity-90 cursor-pointer w-full col-span-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" /> {t('feedbackBtn')}
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
          ↩️
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button w-[34px] h-[34px] flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-1.5 shrink-0"
          title={lang === 'pt' ? 'Refazer (Ctrl+Y)' : 'Rétablir (Ctrl+Y)'}
        >
          ↪️
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
          ⭕ RODA
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
          🎚️ {lang === 'fr' ? 'MIXEUR' : 'MIXADOR'}
        </button>

        {/* TIMELINE */}
        <button
          onClick={() => onViewModeToggle('timeline')}
          className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
            viewMode === 'timeline'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title="Vue Séquence / Ligne temporelle"
        >
          🎞️ {lang === 'fr' ? 'SÉQUENCE' : 'SEQUÊNCIA'}
        </button>

        {/* STUDIO DO MESTRE (Standalone Desktop) */}
        {hasAccess('mestre') && (
          <button
            onClick={() => onViewModeToggle('studio')}
            className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
              viewMode === 'studio'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title={lang === 'pt' ? 'Estúdio do Mestre' : 'Studio du Mestre'}
          >
            👑 {lang === 'pt' ? 'ESTÚDIO' : 'STUDIO'}
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
              🎮 {lang === 'pt' ? 'JOGOS' : 'JEUX'} <span className="text-[10px]">▼</span>
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
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button text-xl px-2 py-1 w-12 text-center cursor-pointer flex justify-center items-center"
          title="Dark / Light Mode"
        >
          {isDarkMode ? '🌞' : '🌙'}
        </button>

        <button
          onClick={onLangToggle}
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button text-sm py-1.5 w-12 text-center font-bold cursor-pointer"
          title="Changer de langue / Mudar idioma"
        >
          {lang === 'pt' ? 'FR' : 'PT'}
        </button>
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

export const Header = HeaderComponent;
