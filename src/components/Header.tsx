import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  Save,
  FolderOpen,
  BookOpen,
  FileText,
  Video,
  Share2,
  SlidersHorizontal
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
  viewMode: 'roda' | 'console';
  onViewModeToggle: (mode: 'roda' | 'console') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onUndo: () => void;
  canUndo: boolean;
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setProjectDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      id="top-bar"
      className="w-full min-h-[70px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-5 py-2.5 gap-2 z-20 relative select-none"
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
              <button onClick={() => { onClear(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors text-[var(--cordel-text)]">
                <Trash2 className="w-4 h-4" /> {t('clear')}
              </button>
              <button onClick={() => { onSave(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors text-[var(--cordel-text)]">
                <Save className="w-4 h-4" /> {t('saveFile')}
              </button>
              <button onClick={() => { onSaveToLocal(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors border-b-2 border-[var(--cordel-border)] text-[var(--cordel-text)]">
                <Save className="w-4 h-4" /> {t('saveLocal')}
              </button>
              <button onClick={() => { fileInputRef.current?.click(); setProjectDropOpen(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full transition-colors border-b-2 border-[var(--cordel-border)] text-[var(--cordel-text)]">
                <FolderOpen className="w-4 h-4" /> {t('loadFile')}
              </button>
              
              <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ''; }} />

              {localPresets.length > 0 && (
                <>
                  <div className="px-4 py-2 text-sm font-cactus font-bold text-[var(--cordel-wood)]">{t('catPersonal')}</div>
                  {localPresets.map((name) => (
                    <button key={`local_${name}`} onClick={() => { onLoadLocalPreset(name); setProjectDropOpen(false); }} className="px-4 py-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full text-sm transition-colors text-[var(--cordel-text)]">
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
                  <button key={file} onClick={() => { onPresetChange(file); setProjectDropOpen(false); }} className="px-4 py-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-left w-full text-sm transition-colors text-[var(--cordel-text)]">
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-2.5 py-1 text-xs font-bold font-cactus uppercase cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 h-[34px] ml-1 shrink-0"
          title={lang === 'pt' ? 'Desfazer (Ctrl+Z)' : 'Annuler (Ctrl+Z)'}
        >
          ↩️ {lang === 'pt' ? 'Desfazer' : 'Annuler'}
        </button>
      </div>

      {/* CENTER: Main Core Actions */}
      <div className="flex items-center justify-center flex-grow gap-4">
        <button
          onClick={() => onViewModeToggle(viewMode === 'roda' ? 'console' : 'roda')}
          className="flex items-center justify-center gap-1.5 h-[36px] px-4 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button cursor-pointer font-bold font-cactus uppercase"
          title="Alterner vue Roda / Console"
        >
          {viewMode === 'roda' ? '🎚️ MIXER' : '⭕ RODA'}
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

        <div className="relative" ref={addDropRef}>
          <button
            onClick={() => setAddDropOpen(!addDropOpen)}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-4 h-[36px] text-sm font-bold font-cactus uppercase transition-all duration-200 cursor-pointer"
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
      </div>
    </div>
  );
};
