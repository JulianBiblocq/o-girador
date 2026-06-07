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
  recordingSeconds?: number;
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
  reverbType: 'room' | 'studio' | 'hall';
  onReverbTypeChange: (type: 'room' | 'studio' | 'hall') => void;
  viewMode: 'roda' | 'console' | 'timeline';
}

export const TransportBar: React.FC<TransportBarProps> = ({
  lang,
  isPlaying,
  onTogglePlay,
  onRewind,
  isRecording,
  recordingSeconds = 0,
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
  reverbType,
  onReverbTypeChange,
  viewMode,
}) => {
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3L4 21h16L12 3z" />
            <line x1="12" y1="18" x2="16" y2="7" />
            <circle cx="15" cy="9.5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="18" r="1" fill="currentColor" />
          </svg>
          <span className="hidden lg:inline">Metrônomo</span>
        </button>

        <button
          onClick={onSwingToggle}
          className={`px-3 py-1 font-cactus font-bold text-sm flex items-center gap-1.5 cordel-border-sm cordel-button hidden md:flex ${
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

        {/* Reverb Type Dropdown */}
        <div className={`flex items-center gap-2 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)] ${viewMode === 'console' ? 'hidden md:flex' : 'hidden'}`}>
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-xs uppercase">Reverb</span>
          <select
            value={reverbType}
            onChange={(e) => onReverbTypeChange(e.target.value as any)}
            className="bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none cursor-pointer"
          >
            <option value="room" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Sala (Room)' : 'Sala'}</option>
            <option value="studio" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Studio' : 'Estúdio'}</option>
            <option value="hall" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'fr' ? 'Cathédrale (Hall)' : 'Catedral'}</option>
          </select>
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
        
        <div className="flex items-center gap-2 relative">
          <button
            onClick={onRecordToggle}
            className={`w-10 h-10 cordel-border cordel-button flex items-center justify-center transition-colors ${
              isRecording ? 'bg-red-600 text-white animate-pulse-red' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-red-100 hover:text-red-800'
            }`}
            title={lang === 'fr' ? "Exporter l'audio en WAV" : lang === 'pt' ? "Exportar áudio em WAV" : "Export Audio to WAV"}
          >
            <Circle className="w-5 h-5" fill="currentColor" />
          </button>
          {isRecording && (
            <span className="font-mono text-red-600 dark:text-red-500 font-bold text-xs animate-pulse absolute left-12 whitespace-nowrap bg-[var(--cordel-bg)] px-1.5 py-0.5 border border-red-600/30 shadow-[2px_2px_0_rgba(239,68,68,0.2)]">
              REC {formatRecordingTime(recordingSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Time Sig, Measures, Volume */}
      <div className="hidden md:flex items-center justify-end gap-4 flex-1">
        
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
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-xs uppercase mr-1">
            {lang === 'pt' ? 'Compassos' : lang === 'fr' ? 'Mesures' : 'Measures'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTotalMeasuresChange(Math.max(1, totalMeasures - 1))}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm"
              style={{ padding: 0 }}
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
              className="w-8 text-center bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none border border-[var(--cordel-border)]/30 rounded-sm"
              style={{ height: '20px' }}
            />
            <button
              onClick={() => onTotalMeasuresChange(Math.min(64, totalMeasures + 1))}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-[10px] cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm"
              style={{ padding: 0 }}
            >+</button>
          </div>
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
