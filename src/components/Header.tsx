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
  MessageSquare
} from 'lucide-react';
import { Language } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';

interface HeaderProps {
  lang: Language;
  onLangToggle: () => void;
  preset: string;
  presetFiles: string[];
  onPresetChange: (val: string) => void;
  onClear: () => void;
  onSave: () => void;
  onSaveToLocal: () => void;
  onLoad: (file: File) => void;
  localPresets: string[];
  onLoadLocalPreset: (name: string) => void;
  onAddInstrument: (instIdx: number) => void;
  activeRightPanel: 'legend' | 'letras' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras') => void;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  viewMode: 'roda' | 'console' | 'timeline';
  onViewModeToggle: (mode: 'roda' | 'console' | 'timeline') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isMobile: boolean;
  isSwingOn: boolean;
  onSwingToggle: () => void;
  masterVol: number;
  onMasterVolChange: (vol: number) => void;
  timeSig: string;
  onTimeSigChange: (sig: any) => void;
  totalMeasures: number;
  onTotalMeasuresChange: (val: number) => void;
  reverbType: 'room' | 'studio' | 'hall';
  onReverbTypeChange: (type: 'room' | 'studio' | 'hall') => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLangToggle,
  preset,
  presetFiles = [],
  onPresetChange,
  onClear,
  onSave,
  onSaveToLocal,
  onLoad,
  localPresets = [],
  onLoadLocalPreset,
  onAddInstrument,
  activeRightPanel,
  onToggleRightPanel,
  isLeftPanelCollapsed,
  onToggleLeftPanel,
  viewMode,
  onViewModeToggle,
  isDarkMode,
  onToggleDarkMode,
  onUndo,
  canUndo,
  isMobile,
  isSwingOn,
  onSwingToggle,
  masterVol,
  onMasterVolChange,
  timeSig,
  onTimeSigChange,
  totalMeasures,
  onTotalMeasuresChange,
  reverbType,
  onReverbTypeChange,
}) => {
  const [addDropOpen, setAddDropOpen] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);
  
  const [projectDropOpen, setProjectDropOpen] = useState(false);
  const projectDropRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isMobile) {
    return (
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

          {/* Drawer Menu dropdown overlay */}
          {mobileMenuOpen && (
            <div className="absolute top-12 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] w-[280px] max-h-[80vh] overflow-y-auto z-[999] flex flex-col p-3 gap-3">
              
              {/* Project Options */}
              <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/30 pb-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide">Projet</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => { onClear(); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    🗑️ {t('clear')}
                  </button>
                  <button onClick={() => { onSave(); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    💾 {t('saveFile').split(' ')[0]}
                  </button>
                  <button onClick={() => { onSaveToLocal(); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    🏠 {t('saveLocal').split(' ')[0]}
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                    📂 {t('loadFile').split(' ')[0]}
                  </button>
                </div>
                <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ''; }} />
              </div>

              {/* Preset Selector */}
              <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/30 pb-2">
                <span className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase tracking-wide">Presets</span>
                <select
                  value={preset}
                  onChange={(e) => { onPresetChange(e.target.value); setMobileMenuOpen(false); }}
                  className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-xs font-bold p-1.5 cordel-border-sm outline-none cursor-pointer mt-1"
                >
                  <option value="" disabled>{lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme'}</option>
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
                </select>
              </div>

              {/* Master Volume */}
              <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/30 pb-2">
                <span className="text-[10px] font-bold text-[var(--cordel-text)]/70 uppercase tracking-wide">Volume Général</span>
                <input
                  type="range"
                  min="-40"
                  max="6"
                  value={masterVol}
                  onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none outline-none cursor-pointer mt-1"
                  style={{ accentColor: 'var(--cordel-text)' }}
                />
              </div>

              {/* Reverb, Swing, Tempo Sig, Measures */}
              <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-2">
                {viewMode === 'console' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-cactus font-bold text-[var(--cordel-text)]">Reverb</span>
                    <select
                      value={reverbType}
                      onChange={(e) => onReverbTypeChange(e.target.value as any)}
                      className="bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none cursor-pointer cordel-border-sm px-1.5 py-0.5"
                    >
                      <option value="room" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Sala (Room)' : 'Sala'}</option>
                      <option value="studio" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Studio' : 'Estúdio'}</option>
                      <option value="hall" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Cathédrale (Hall)' : 'Catedral'}</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-cactus font-bold text-[var(--cordel-text)]">Swing Maracatu</span>
                  <button
                    onClick={onSwingToggle}
                    className={`px-2 py-0.5 font-cactus font-bold text-xs cordel-border-sm cordel-button cursor-pointer ${
                      isSwingOn ? 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
                    }`}
                  >
                    {isSwingOn ? 'ON' : 'OFF'}
                  </button>
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

                <div className="flex items-center justify-between">
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
              </div>

              {/* Secondary Buttons Panel */}
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => { onUndo(); setMobileMenuOpen(false); }} disabled={!canUndo} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  ↩️ {lang === 'pt' ? 'Desfazer' : 'Annuler'}
                </button>
                <button onClick={() => { onToggleDarkMode(); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                  {isDarkMode ? '🌞 Light' : '🌙 Dark'}
                </button>
                <button onClick={() => { onLangToggle(); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer">
                  🌐 {lang === 'pt' ? 'FR' : 'PT'}
                </button>
                <button onClick={() => { onToggleRightPanel('legend'); setMobileMenuOpen(false); }} className={`px-2 py-1 cordel-border-sm text-xs font-bold font-cactus cursor-pointer ${activeRightPanel === 'legend' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'}`}>
                  📖 {t('legend')}
                </button>
                <button onClick={() => { onToggleRightPanel('letras'); setMobileMenuOpen(false); }} className={`px-2 py-1 cordel-border-sm text-xs font-bold font-cactus cursor-pointer ${activeRightPanel === 'letras' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'}`}>
                  📝 TOADA
                </button>
                <button onClick={() => { window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[#e67e22] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer">
                  🎥 Tuto
                </button>
                <button onClick={() => { window.open('tutorial.html', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[#8e44ad] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer">
                  📖 Guide
                </button>
                <button onClick={() => {
                  const url = window.location.href;
                  const text = lang === 'pt' ? 'Descubra BaqueMix, um sequenciador de ritmos de Maracatu!' : 'Découvrez BaqueMix, un séquenceur de rythmes de Maracatu !';
                  if (navigator.share) {
                    navigator.share({ title: 'BaqueMix', text, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => {
                      window.alert(lang === 'pt' ? 'Link copiado!' : 'Lien copié !');
                    });
                  }
                  setMobileMenuOpen(false);
                }} className="px-2 py-1 bg-[#2980b9] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer">
                  🔗 Partager
                </button>
                <button onClick={() => { window.open('https://github.com/JulianBiblocq/BaqueMix/issues', '_blank'); setMobileMenuOpen(false); }} className="px-2 py-1 bg-[#27ae60] text-[#1a1a1a] cordel-border-sm text-xs font-bold font-cactus hover:opacity-90 cursor-pointer col-span-2">
                  💬 {t('feedbackBtn')}
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Center: App Title */}
        <span className="font-cactus text-[var(--cordel-text)] text-2xl font-medium tracking-widest uppercase select-none cursor-default">
          BaqueMix
        </span>

        {/* Right: Quick actions (View Switcher and Add Instrument) */}
        <div className="flex items-center gap-2">
          {/* RODA */}
          <button
            onClick={() => onViewModeToggle('roda')}
            className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
              viewMode === 'roda'
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
            title="Roda"
          >
            ⭕
          </button>

          {/* MIXER */}
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

          {/* Add Instrument Dropdown */}
          <div className="relative" ref={addDropRef}>
            <button
              onClick={() => setAddDropOpen(!addDropOpen)}
              className="w-9 h-9 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button flex items-center justify-center font-bold text-lg hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer"
            >
              ➕
            </button>
            {addDropOpen && (
              <div className="absolute top-10 right-0 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] min-w-[185px] max-h-[250px] overflow-y-auto z-[999]">
                {instrumentsConfig.map((inst, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onAddInstrument(idx);
                      setAddDropOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-b border-[var(--cordel-border)] cursor-pointer"
                  >
                    <img
                      src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                      alt={inst.name}
                      className="w-4 h-4 object-contain filter invert opacity-80"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span>{inst.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div
      id="top-bar"
      className="w-full min-h-[70px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-5 py-2.5 gap-2 z-50 relative select-none shrink-0"
    >
      {/* LEFT: Burger, Title, Project Menu */}
      <div className="flex items-center gap-3">
        {isLeftPanelCollapsed && (
          <button
            onClick={onToggleLeftPanel}
            className="flex items-center justify-center p-2 text-[var(--cordel-bg)] bg-[var(--cordel-text)] cordel-border cordel-button cursor-pointer"
            title={t('toggleBtn')}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        )}
        <span
          id="header-title-text"
          className="font-cactus text-[var(--cordel-text)] text-3xl font-medium tracking-widest uppercase select-none cursor-default drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          BaqueMix
        </span>
        
        <div className="relative ml-2" ref={projectDropRef}>
          <button
            onClick={() => setProjectDropOpen(!projectDropOpen)}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-1.5 font-bold font-cactus uppercase cursor-pointer flex items-center gap-2"
          >
            Projet <span className="text-[10px]">▼</span>
          </button>
          
          {projectDropOpen && (
            <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] min-w-[200px] z-[100] flex flex-col py-1">
              <button onClick={() => { onClear(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors text-[var(--cordel-text)] cursor-pointer">
                <Trash2 className="w-4 h-4" /> {t('clear')}
              </button>
              <button onClick={() => { onSave(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors text-[var(--cordel-text)] cursor-pointer">
                <Save className="w-4 h-4" /> {t('saveFile')}
              </button>
              <button onClick={() => { onSaveToLocal(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors border-b-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cursor-pointer">
                <Save className="w-4 h-4" /> {t('saveLocal')}
              </button>
              <button onClick={() => { fileInputRef.current?.click(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors border-b-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cursor-pointer">
                <FolderOpen className="w-4 h-4" /> {t('loadFile')}
              </button>
              
              <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ''; }} />

              {localPresets.length > 0 && (
                <>
                  <div className="px-4 py-2 text-sm font-cactus font-bold text-[var(--cordel-wood)]">{t('catPersonal')}</div>
                  {localPresets.map((name) => (
                    <button key={`local_${name}`} onClick={() => { onLoadLocalPreset(name); setProjectDropOpen(false); }} className="px-4 py-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full text-sm transition-colors text-[var(--cordel-text)] cursor-pointer">
                      {name}
                    </button>
                  ))}
                  <div className="border-t-2 border-[var(--cordel-border)] mt-1 mb-1"></div>
                </>
              )}

              <div className="px-4 py-2 text-sm font-cactus font-bold text-[var(--cordel-wood)]">{t('catDefault')}</div>
              {presetFiles.map((file) => {
                let label = file.replace(/\.json$/, '');
                if (label.startsWith('_')) label = label.substring(1);
                label = label.replace(/_/g, ' ');
                return (
                  <button key={file} onClick={() => { onPresetChange(file); setProjectDropOpen(false); }} className="px-4 py-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full text-sm transition-colors text-[var(--cordel-text)] cursor-pointer">
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative ml-2" ref={addDropRef}>
          <button
            onClick={() => setAddDropOpen(!addDropOpen)}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 h-[34px] text-xs font-bold font-cactus uppercase transition-all duration-200 cursor-pointer"
          >
            + {t('addInst')}
          </button>
          
          {addDropOpen && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] min-w-[200px] max-h-[300px] overflow-y-auto z-[100]">
              {instrumentsConfig.map((inst, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onAddInstrument(idx);
                    setAddDropOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-b border-[var(--cordel-border)] cursor-pointer"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-5 h-5 object-contain filter invert opacity-80"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>{inst.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button w-[34px] h-[34px] flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-1.5 shrink-0"
          title={lang === 'pt' ? 'Desfazer (Ctrl+Z)' : 'Annuler (Ctrl+Z)'}
        >
          ↩️
        </button>
      </div>

      {/* CENTER: Main Core Actions */}
      <div className="flex items-center justify-center flex-grow gap-4">
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

        <button
          onClick={() => onToggleRightPanel('letras')}
          className={`flex items-center justify-center gap-1.5 h-[36px] px-4 font-cactus uppercase font-bold cordel-border cordel-button cursor-pointer ${
            activeRightPanel === 'letras'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title={t('toggleLetrasBtn')}
        >
          <FileText className="w-4 h-4" /> TOADA
        </button>
      </div>

      {/* RIGHT: Auxiliary */}
      <div className="flex items-center justify-end flex-wrap gap-2.5">
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

        <button
          onClick={() => window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank')}
          className="bg-[#e67e22] text-[#1a1a1a] hover:opacity-90 px-3 py-1.5 text-sm font-bold cordel-border-sm flex items-center justify-center cursor-pointer"
          title={t('tutorialBtn')}
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          onClick={() => window.open('tutorial.html', '_blank')}
          className="bg-[#8e44ad] text-[#1a1a1a] hover:opacity-90 px-3 py-1.5 text-sm font-bold cordel-border-sm flex items-center justify-center cursor-pointer"
          title="Guide / Tutorial"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            const url = window.location.href;
            const text = lang === 'pt'
              ? 'Descubra BaqueMix, um sequenciador de ritmos de Maracatu!'
              : 'Découvrez BaqueMix, un séquenceur de rythmes de Maracatu !';
            if (navigator.share) {
              navigator.share({ title: 'BaqueMix', text, url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(url).then(() => {
                window.alert(lang === 'pt' ? 'Link copiado!' : 'Lien copié !');
              });
            }
          }}
          className="bg-[#2980b9] text-[#1a1a1a] hover:opacity-90 px-3 py-1.5 text-sm font-bold cordel-border-sm flex items-center justify-center cursor-pointer"
          title={lang === 'pt' ? 'Compartilhar' : 'Partager'}
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => window.open('https://github.com/JulianBiblocq/BaqueMix/issues', '_blank')}
          className="bg-[#27ae60] text-[#1a1a1a] hover:opacity-90 px-3 py-1.5 text-sm font-bold cordel-border-sm flex items-center justify-center cursor-pointer"
          title={t('feedbackBtn')}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
