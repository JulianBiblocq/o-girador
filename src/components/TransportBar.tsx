import React from 'react';
import { Play, Square, SkipBack, Circle, Volume2 } from 'lucide-react';
import { Language, TimeSignature } from '../types';
import { i18n } from '../data';

interface TransportBarProps {
  lang: Language;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRewind: () => void;
  isRecording: boolean;
  onRecordToggle: () => void;
  bpm: number;
  onBpmChange: (val: number) => void;
  isMetroOn: boolean;
  onMetroToggle: () => void;
  isSwingOn: boolean;
  onSwingToggle: () => void;
  masterVol: number;
  onMasterVolChange: (vol: number) => void;
  timeSig: TimeSignature;
  onTimeSigChange: (sig: TimeSignature) => void;
  totalMeasures: number;
  onTotalMeasuresChange: (measures: number) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  lang,
  isPlaying,
  onTogglePlay,
  onRewind,
  isRecording,
  onRecordToggle,
  bpm,
  onBpmChange,
  isMetroOn,
  onMetroToggle,
  isSwingOn,
  onSwingToggle,
  masterVol,
  onMasterVolChange,
  timeSig,
  onTimeSigChange,
  totalMeasures,
  onTotalMeasuresChange,
}) => {
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  return (
    <div className="w-full h-[60px] bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-4 z-50">
      
      {/* Left side: Metro, Swing, BPM */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMetroToggle}
          className={`px-3 py-1 font-cactus font-bold text-sm flex items-center gap-1.5 cordel-border-sm cordel-button ${
            isMetroOn ? 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={t('metroBtn')}
        >
          <span>⏱</span>
          <span className="hidden lg:inline">Metrônomo</span>
        </button>

        <button
          onClick={onSwingToggle}
          className={`px-3 py-1 font-cactus font-bold text-sm flex items-center gap-1.5 cordel-border-sm cordel-button ${
            isSwingOn ? 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title="Swing Maracatu"
        >
          <span>〰️</span>
          <span className="hidden lg:inline">Swing</span>
        </button>

        <div className="flex items-center gap-2 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)]">
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-sm">BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => {
              let val = Math.round(Number(e.target.value));
              if (val < 40) val = 40;
              if (val > 240) val = 240;
              onBpmChange(val);
            }}
            className="w-12 bg-transparent text-center font-bold text-[var(--cordel-text)] outline-none"
          />
        </div>
      </div>

      {/* Center: Main Transport Controls */}
      <div className="flex items-center justify-center gap-3 flex-1">
        <button
          onClick={onRewind}
          className="w-10 h-10 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
          title="Retour au début"
        >
          <SkipBack className="w-5 h-5" fill="currentColor" />
        </button>
        
        <button
          onClick={onTogglePlay}
          className={`w-14 h-14 cordel-border cordel-button flex items-center justify-center transition-colors ${
            isPlaying ? 'bg-[#f1c40f] text-[#1a1a1a]' : 'bg-[var(--cordel-wood)] text-[var(--cordel-text)]'
          }`}
          title={isPlaying ? 'Pause' : 'Lecture'}
        >
          {isPlaying ? <Square className="w-6 h-6" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
        </button>
        
        <button
          onClick={onRecordToggle}
          className={`w-10 h-10 cordel-border cordel-button flex items-center justify-center transition-colors ${
            isRecording ? 'bg-red-600 text-white animate-pulse-red' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-red-100 hover:text-red-800'
          }`}
          title="Enregistrer"
        >
          <Circle className="w-5 h-5" fill="currentColor" />
        </button>
      </div>

      {/* Right side: Time Sig, Measures, Volume */}
      <div className="flex items-center justify-end gap-4 flex-1">
        
        <div className="flex items-center gap-1.5 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)] hidden md:flex">
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-xs uppercase">{t('tsLabel')}</span>
          <select
            value={timeSig}
            onChange={(e) => onTimeSigChange(e.target.value as TimeSignature)}
            className="bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none cursor-pointer"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="2/4">2/4</option>
            <option value="6/8">6/8</option>
            <option value="12/8">12/8</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)] hidden md:flex">
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-xs uppercase">
            {lang === 'pt' ? 'Compassos' : lang === 'fr' ? 'Mesures' : 'Measures'}
          </span>
          <select
            value={totalMeasures}
            onChange={(e) => onTotalMeasuresChange(parseInt(e.target.value))}
            className="bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none cursor-pointer"
          >
            <option value="2">2</option>
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="16">16</option>
            <option value="32">32</option>
          </select>
        </div>

        <div className="flex items-center gap-2" title="Volume Geral">
          <Volume2 className="w-4 h-4 text-[var(--cordel-text)] shrink-0" />
          <input
            type="range"
            min="-40"
            max="6"
            value={masterVol}
            onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
            className="w-20 md:w-24 h-2 bg-[var(--cordel-text)] border border-[var(--cordel-border)] rounded-none outline-none cursor-pointer"
            style={{ accentColor: 'var(--cordel-text)' }}
          />
        </div>

      </div>
    </div>
  );
};
