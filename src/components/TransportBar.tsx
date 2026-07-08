/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, SkipBack, Circle, Repeat, ArrowRightToLine, Loader2, Gauge } from 'lucide-react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { i18n } from '../data';
import { DragNumberBox } from './DragNumberBox';
import { metroChannel } from '../audio/effectsChain';
import * as Tone from 'tone';

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
    metroVolume,
    setMetroVolume,
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

  const bpmIntervalRef = React.useRef<number | null>(null);
  const bpmTimeoutRef = React.useRef<number | null>(null);

  const stopBpmChange = React.useCallback(() => {
    if (bpmTimeoutRef.current) {
      window.clearTimeout(bpmTimeoutRef.current);
      bpmTimeoutRef.current = null;
    }
    if (bpmIntervalRef.current) {
      window.clearInterval(bpmIntervalRef.current);
      bpmIntervalRef.current = null;
    }
  }, []);

  const startBpmChange = React.useCallback((delta: number) => {
    setBpm(prev => Math.min(240, Math.max(40, prev + delta)));
    
    bpmTimeoutRef.current = window.setTimeout(() => {
      bpmIntervalRef.current = window.setInterval(() => {
        setBpm(prev => Math.min(240, Math.max(40, prev + delta)));
      }, 75);
    }, 400);
  }, [setBpm]);

  React.useEffect(() => {
    return stopBpmChange;
  }, [stopBpmChange]);

  return (
    <div className="w-full h-[60px] bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-4 z-50 shrink-0">
      
      {/* Left side: Metro, Swing, BPM */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-1.5 bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden h-[30px] pr-2">
          <button
            onClick={() => setIsMetroOn(!isMetroOn)}
            className={`px-2.5 py-1 font-cactus font-bold text-sm flex items-center justify-center h-full transition-colors border-r border-[var(--cordel-border)]/20 ${
              isMetroOn ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/5'
            }`}
            title={t('metroBtn')}
            style={{ borderStyle: 'solid', borderWidth: '0 1px 0 0', borderRadius: 0 }}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3L4 21h16L12 3z" />
              <line x1="12" y1="18" x2="16" y2="7" />
              <circle cx="15" cy="9.5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="18" r="1" fill="currentColor" />
            </svg>
          </button>

          <DragNumberBox
            label="Vol"
            value={metroVolume}
            onChange={(val) => {
              setMetroVolume(val);
              if (metroChannel && metroChannel.volume) {
                const gain = Math.max(0.00001, val / 100);
                const db = val === 0 ? -Infinity : Tone.gainToDb(gain);
                metroChannel.volume.value = db;
              }
            }}
            className="w-16 h-[22px] text-[10px] ml-1 bg-transparent border-0"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)]">
          <Gauge className="w-4 h-4 text-[var(--cordel-text)] md:hidden" />
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-sm select-none hidden md:inline">
            {lang === 'fr' ? 'Vitesse' : lang === 'pt' ? 'Velocidade' : 'Tempo'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onPointerDown={(e) => { e.preventDefault(); startBpmChange(-1); }}
              onPointerUp={(e) => { e.preventDefault(); stopBpmChange(); }}
              onPointerLeave={(e) => { e.preventDefault(); stopBpmChange(); }}
              onPointerCancel={(e) => { e.preventDefault(); stopBpmChange(); }}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm active:scale-95 transition-all select-none"
              title={lang === 'fr' ? 'Diminuer le tempo' : lang === 'pt' ? 'Diminuir o tempo' : 'Decrease tempo'}
              style={{ padding: 0, touchAction: 'none' }}
            >
              -
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); startBpmChange(1); }}
              onPointerUp={(e) => { e.preventDefault(); stopBpmChange(); }}
              onPointerLeave={(e) => { e.preventDefault(); stopBpmChange(); }}
              onPointerCancel={(e) => { e.preventDefault(); stopBpmChange(); }}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm active:scale-95 transition-all select-none"
              title={lang === 'fr' ? 'Augmenter le tempo' : lang === 'pt' ? 'Aumentar o tempo' : 'Increase tempo'}
              style={{ padding: 0, touchAction: 'none' }}
            >
              +
            </button>
          </div>
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
          disabled={audio.isLoading}
          className={`w-14 h-14 cordel-border cordel-button flex items-center justify-center transition-colors ${
            audio.isLoading ? 'bg-gray-400 text-gray-700 cursor-wait' : isPlaying ? 'bg-[#f1c40f] text-[#1a1a1a]' : 'bg-[var(--cordel-wood)] text-[#f4ecd8]'
          }`}
          title={audio.isLoading ? (lang === 'pt' ? 'Carregando sons...' : 'Chargement des sons...') : isPlaying ? (lang === 'pt' ? 'Pausar' : 'Pause') : (lang === 'pt' ? 'Tocar' : 'Lecture')}
        >
          {audio.isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : isPlaying ? <Square className="w-6 h-6" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
        </button>
        
        <button
          onClick={() => sequencer.setIsLooping(!sequencer.isLooping)}
          className={`w-10 h-10 cordel-border cordel-button flex items-center justify-center transition-colors ${
            sequencer.isLooping ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] opacity-60 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
          }`}
          title={lang === 'fr' ? 'Activer/Désactiver la boucle' : 'Toggle Loop'}
        >
          {sequencer.isLooping ? <Repeat className="w-5 h-5" /> : <ArrowRightToLine className="w-5 h-5" />}
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
