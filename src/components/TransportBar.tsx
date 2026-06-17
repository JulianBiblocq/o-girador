/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, SkipBack, Circle } from 'lucide-react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { i18n } from '../data';

interface TransportBarProps {
  viewMode: 'roda' | 'console' | 'timeline';
}

const TransportBarComponent: React.FC<TransportBarProps> = ({ viewMode }) => {
  const sequencer = useSequencer();
  const audio = useAudio();

  const { lang, bpm, setBpm, isLeftHanded, setIsLeftHanded } = sequencer;
  const {
    isPlaying,
    isRecording,
    recordingSeconds = 0,
    isMetroOn,
    setIsMetroOn,
    isSwingOn,
    setIsSwingOn,
    reverbType,
    setReverbType,
    handleTogglePlay,
    handleStop,
    handleAudioRecordingToggle,
  } = audio;

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full h-[60px] bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-4 z-50 shrink-0">
      
      {/* Left side: Metro, Swing, BPM */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => setIsMetroOn(!isMetroOn)}
          className={`px-3 py-1 font-cactus font-bold text-sm flex items-center gap-1.5 cordel-border-sm cordel-button ${
            isMetroOn ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
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
          <span className="hidden lg:inline">{lang === 'pt' ? 'Metrônomo' : 'Métronome'}</span>
        </button>

        <button
          onClick={() => setIsSwingOn(!isSwingOn)}
          className={`px-3 py-1 font-cactus font-bold text-sm flex items-center gap-1.5 cordel-border-sm cordel-button hidden md:flex ${
            isSwingOn ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'pt' ? 'Suingue Maracatu' : 'Swing Maracatu'}
        >
          <span className="text-base font-bold leading-none">≈</span>
          <span className="hidden lg:inline">{t('swingBtn')}</span>
        </button>

        <button
          onClick={() => setIsLeftHanded(!isLeftHanded)}
          className={`px-3 py-1 font-cactus font-bold text-sm flex items-center gap-1.5 cordel-border-sm cordel-button ${
            isLeftHanded ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'fr' ? 'Contrôles pour gaucher' : lang === 'pt' ? 'Controles para canhoto' : 'Left-handed controls'}
        >
          <span className="text-base font-bold leading-none">🫲</span>
          <span className="hidden lg:inline">{lang === 'fr' ? 'Gaucher' : 'Canhoto'}</span>
        </button>

        <div className="flex items-center gap-1.5 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)]">
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-sm select-none">
            {lang === 'fr' ? 'Vitesse' : lang === 'pt' ? 'Velocidade' : 'Tempo'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBpm(Math.max(40, bpm - 1))}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm active:scale-95 transition-all"
              title={lang === 'fr' ? 'Diminuer le tempo' : lang === 'pt' ? 'Diminuir o tempo' : 'Decrease tempo'}
              style={{ padding: 0 }}
            >
              -
            </button>
            <button
              onClick={() => setBpm(Math.min(240, bpm + 1))}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm active:scale-95 transition-all"
              title={lang === 'fr' ? 'Augmenter le tempo' : lang === 'pt' ? 'Aumentar o tempo' : 'Increase tempo'}
              style={{ padding: 0 }}
            >
              +
            </button>
          </div>
        </div>

        {/* Reverb Type Dropdown */}
        <div className={`flex items-center gap-2 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)] ${viewMode === 'console' ? 'hidden md:flex' : 'hidden'}`}>
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-xs uppercase">Reverb</span>
          <select
            value={reverbType}
            onChange={(e) => setReverbType(e.target.value as any)}
            className="bg-transparent text-[var(--cordel-text)] font-cactus text-xs font-bold outline-none cursor-pointer"
          >
            <option value="room" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'pt' ? 'Sala (Room)' : 'Pièce (Room)'}</option>
            <option value="studio" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'pt' ? 'Estúdio' : 'Studio'}</option>
            <option value="hall" className="bg-[var(--cordel-bg)] text-[var(--cordel-text)]">{lang === 'pt' ? 'Catedral (Hall)' : 'Cathédrale (Hall)'}</option>
          </select>
        </div>
      </div>

      {/* Center: Main Transport Controls */}
      <div className="flex items-center justify-center gap-3 flex-1">
        <button
          onClick={handleStop}
          className="w-10 h-10 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
          title={lang === 'pt' ? 'Voltar au início' : 'Retour au début'}
        >
          <SkipBack className="w-5 h-5" fill="currentColor" />
        </button>
        
        <button
          onClick={handleTogglePlay}
          className={`w-14 h-14 cordel-border cordel-button flex items-center justify-center transition-colors ${
            isPlaying ? 'bg-[#f1c40f] text-[#1a1a1a]' : 'bg-[var(--cordel-wood)] text-[#f4ecd8]'
          }`}
          title={isPlaying ? (lang === 'pt' ? 'Pausar' : 'Pause') : (lang === 'pt' ? 'Tocar' : 'Lecture')}
        >
          {isPlaying ? <Square className="w-6 h-6" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
        </button>
        
        <div className="flex items-center gap-2 relative">
          <button
            onClick={handleAudioRecordingToggle}
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

      {/* Right side filler to keep center controls centered */}
      <div className="hidden md:block flex-1" />
    </div>
  );
};

export const TransportBar = React.memo(TransportBarComponent);
