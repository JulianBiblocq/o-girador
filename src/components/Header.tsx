/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Tv,
  Trash2,
  Save,
  FolderOpen,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  Video
} from 'lucide-react';
import { Language, TimeSignature } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';

interface HeaderProps {
  lang: Language;
  onLangToggle: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  masterVol: number;
  onMasterVolChange: (vol: number) => void;
  timeSig: TimeSignature;
  onTimeSigChange: (sig: TimeSignature) => void;
  isMetroOn: boolean;
  onMetroToggle: () => void;
  isSwingOn: boolean;
  onSwingToggle: () => void;
  onRewind: () => void;
  preset: string;
  onPresetChange: (val: string) => void;
  isRecording: boolean;
  onRecordToggle: () => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onAddInstrument: (idx: number) => void;
  activeRightPanel: 'legend' | 'letras' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras') => void;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLangToggle,
  bpm,
  onBpmChange,
  masterVol,
  onMasterVolChange,
  timeSig,
  onTimeSigChange,
  isMetroOn,
  onMetroToggle,
  isSwingOn,
  onSwingToggle,
  onRewind,
  preset,
  onPresetChange,
  isRecording,
  onRecordToggle,
  onClear,
  onSave,
  onLoad,
  onAddInstrument,
  activeRightPanel,
  onToggleRightPanel,
  isLeftPanelCollapsed,
  onToggleLeftPanel,
}) => {
  const [addDropOpen, setAddDropOpen] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  // Close custom dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      id="top-bar"
      className="w-full min-h-[70px] bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-b-2 border-[#eaddcf] flex flex-wrap items-center justify-between px-5 py-2.5 gap-2 z-20 relative select-none"
    >
      {/* Title & Burger Toggle */}
      <div className="flex items-center gap-3">
        {isLeftPanelCollapsed && (
          <button
            onClick={onToggleLeftPanel}
            className="flex items-center justify-center p-2 text-[#eaddcf] border border-[#444] bg-[#222] hover:bg-[#333] transition-all cursor-pointer"
            title={t('toggleBtn')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <span
          id="header-title-text"
          className="font-cactus text-white text-3xl font-medium tracking-widest uppercase select-none cursor-default drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{ fontFamily: 'Cactus, Georgia, serif' }}
        >
          BaqueMix
        </span>
      </div>

      {/* Main Core Controls */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Time Signature */}
        <label className="flex items-center gap-1.5 text-xs text-[#eaddcf] font-bold">
          <span>{t('tsLabel')}</span>
          <select
            value={timeSig}
            onChange={(e) => onTimeSigChange(e.target.value as TimeSignature)}
            className="bg-[#2a2420] text-[#f5f5f5] border border-[#eaddcf] py-1 px-2 text-sm font-bold uppercase cursor-pointer focus:outline-none"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="2/4">2/4</option>
            <option value="6/8">6/8</option>
            <option value="12/8">12/8</option>
          </select>
        </label>

        <div className="w-[1px] h-7 bg-[#444]" />

        {/* BPM */}
        <label className="flex items-center gap-1.5 text-xs text-[#eaddcf] font-bold">
          <span>BPM:</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => {
              let val = Math.round(Number(e.target.value));
              if (val < 40) val = 40;
              if (val > 240) val = 240;
              onBpmChange(val);
            }}
            min="40"
            max="240"
            className="w-14 bg-[#2a2420] text-[#f5f5f5] border border-[#eaddcf] py-0.5 text-center text-sm font-semibold select-all"
          />
        </label>

        <div className="w-[1px] h-7 bg-[#444]" />

        {/* Master Volume */}
        <label className="flex items-center gap-2 text-xs text-[#eaddcf] font-bold" title="Volume Geral">
          <Volume2 className="w-4 h-4 text-[#eaddcf] shrink-0" />
          <input
            type="range"
            min="-40"
            max="6"
            value={masterVol}
            onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
            className="w-20 md:w-28 h-1 bg-[#444] rounded outline-none cursor-pointer accent-[#eaddcf]"
          />
        </label>

        <div className="w-[1px] h-7 bg-[#444]" />

        {/* Metronome */}
        <button
          onClick={onMetroToggle}
          className={`flex items-center justify-center p-2 border border-[#eaddcf] font-bold transition-all shrink-0 cursor-pointer ${
            isMetroOn
              ? 'bg-[#f1c40f] text-black border-[#f1c40f]'
              : 'bg-[#333] text-[#eaddcf] hover:bg-[#eaddcf] hover:text-black'
          }`}
          title="Metrônomo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M12 2L9 22M12 2l3 20" />
            <path d="M7 22h10" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>

        {/* Swing Maracatu */}
        <button
          onClick={onSwingToggle}
          className={`flex items-center justify-center px-2 py-1 border font-bold text-xs transition-all shrink-0 cursor-pointer ${
            isSwingOn
              ? 'bg-[#f39c12] text-black border-[#f39c12] shadow-[0_0_8px_rgba(243,156,18,0.7)]'
              : 'bg-[#333] text-[#eaddcf] border-[#555] hover:bg-[#eaddcf] hover:text-black'
          }`}
          title="Swing Maracatu"
        >
          ≈
        </button>

        {/* Playback Stop & Rewind */}
        <button
          onClick={onRewind}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#8b0000] hover:bg-[#a60000] border-2 border-[#121212] cursor-pointer shadow-[0_3px_6px_rgba(0,0,0,0.6)] transition-all"
          title={t('rewindBtn')}
        >
          <SkipBack className="w-5 h-5 text-black stroke-[2.5px]" />
        </button>

        {/* Presets Slider Selector */}
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          className="bg-[#2a2420] text-[#f5f5f5] border border-[#eaddcf] py-1 px-2.5 text-sm font-bold cursor-pointer focus:outline-none"
        >
          <option value="vou-vadiar">Vou vadiar carnaval</option>
          <option value="baque-de-imale">Baque de Imale</option>
        </select>
      </div>

      {/* Auxiliary Buttons */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Language selector */}
        <button
          onClick={onLangToggle}
          className="bg-[#8e44ad] hover:opacity-90 border border-[#eaddcf] text-sm py-1.5 w-12 text-center text-[#eaddcf] font-bold transition-all shrink-0 cursor-pointer"
          title="Changer de langue / Mudar idioma"
        >
          {lang === 'pt' ? 'FR' : 'PT'}
        </button>

        {/* Video Tutorial */}
        <button
          onClick={() => window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank')}
          className="bg-[#e67e22] text-[#f5f5f5] hover:opacity-90 px-3 py-1.5 text-sm font-bold border border-[#eaddcf] flex items-center justify-center cursor-pointer"
          title={t('tutorialBtn')}
        >
          <Video className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-7 bg-[#444]" />

        {/* ADD INSTRUMENT DROPDOWN */}
        <div className="relative" ref={addDropRef}>
          <button
            onClick={() => setAddDropOpen(!addDropOpen)}
            className="bg-[#2ecc71] hover:bg-[#27ae60] text-black border border-[#eaddcf] px-4 py-1.5 text-sm font-bold uppercase transition-all duration-200 cursor-pointer"
          >
            {t('addInst')}
          </button>
          
          {addDropOpen && (
            <div className="absolute top-10 right-0 bg-[#222] border-2 border-[#eaddcf] shadow-[0_4px_10px_rgba(0,0,0,0.8)] min-w-[200px] max-h-[300px] overflow-y-auto z-[100]">
              {instrumentsConfig.map((inst, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onAddInstrument(idx);
                    setAddDropOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-white hover:bg-[#f1c40f] hover:text-black hover:font-bold border-b border-[#333] cursor-pointer"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-5 h-5 object-contain"
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

        {/* Recorder toggler */}
        <button
          onClick={onRecordToggle}
          className={`px-3 py-1.5 border font-semibold text-sm transition-all focus:outline-none flex items-center gap-1 cursor-pointer shrink-0 ${
            isRecording
              ? 'bg-[#8b0000] text-white border-[#8b0000] animate-[#pulse-red_1.5s_infinite]'
              : 'bg-[#444] text-[#eaddcf] border-[#eaddcf] hover:bg-[#eaddcf] hover:text-black'
          }`}
          title="Gravar Áudio / Enregistrer Audio"
        >
          🔴 {isRecording ? 'REC' : ''}
        </button>

        {/* Storage ops */}
        <button
          onClick={onClear}
          className="bg-[#333] hover:bg-neutral-800 text-[#eaddcf] border border-[#eaddcf] p-2 hover:border-[#f1c40f] transition-all cursor-pointer"
          title={t('clear')}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={onSave}
          className="bg-[#2980b9] hover:bg-[#216897] text-[#eaddcf] border border-[#eaddcf] p-2 transition-all cursor-pointer"
          title={t('save')}
        >
          <Save className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#2980b9] hover:bg-[#216897] text-[#eaddcf] border border-[#eaddcf] p-2 transition-all cursor-pointer"
          title={t('load')}
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLoad(f);
            e.target.value = ''; // reset selection
          }}
        />

        <div className="w-[1px] h-7 bg-[#444]" />

        {/* Side panels toggle buttons */}
        <button
          onClick={() => onToggleRightPanel('legend')}
          className={`p-2 border transition-all cursor-pointer shrink-0 ${
            activeRightPanel === 'legend'
              ? 'bg-[#eaddcf] text-black border-[#eaddcf]'
              : 'bg-transparent text-[#eaddcf] border-[#444] hover:bg-[#333]'
          }`}
          title={t('toggleLegendBtn')}
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          onClick={() => onToggleRightPanel('letras')}
          className={`p-2 border transition-all cursor-pointer shrink-0 ${
            activeRightPanel === 'letras'
              ? 'bg-[#eaddcf] text-black border-[#eaddcf]'
              : 'bg-transparent text-[#eaddcf] border-[#444] hover:bg-[#333]'
          }`}
          title={t('toggleLetrasBtn')}
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {/* Credit Toni Braga */}
      <div className="absolute bottom-0.5 right-2 text-[9px] text-[#eaddcf]/30 pointer-events-none select-none">
        {t('creditLabel')}
      </div>
    </div>
  );
};
