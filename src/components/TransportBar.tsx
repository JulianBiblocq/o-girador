/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, SkipBack, Circle, Repeat, ArrowRightToLine, Loader2, Gauge } from 'lucide-react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useShallow } from 'zustand/react/shallow';
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
  const sequencerSettings = useSequencerSettingsStore();

  const { lang, bpm, setBpm, isLeftHanded, setIsLeftHanded } = sequencer;
  
  const {
    isMetroOn,
    setIsMetroOn,
    metroVolume,
    setMetroVolume
  } = useTransportStore(
    useShallow((state) => ({
      isMetroOn: state.isMetroOn,
      setIsMetroOn: state.setIsMetroOn,
      metroVolume: state.metroVolume,
      setMetroVolume: state.setMetroVolume
    }))
  );

  const isRecording = useAudioStore(state => state.isRecording);
  const recordingSeconds = useAudioStore(state => state.recordingSeconds);
  const loopMode = useSequencerStore(state => state.loopMode);
  const currentLoopIteration = useSequencerStore(state => state.currentLoopIteration);
  const isLoopBypassed = useSequencerStore(state => state.isLoopBypassed);

  const {
    isPlaying,
    handleTogglePlay,
    handleStop,
    handleAudioRecordingToggle,
  } = audio;

  const [showLoopMenu, setShowLoopMenu] = React.useState(false);
  const loopBtnRef = React.useRef<HTMLButtonElement>(null);
  const loopMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Zero-Render-Thrashing feedback for loop exit
    const unsub = useSequencerStore.subscribe(
      (state) => state.isLoopExitRequested,
      (isRequested) => {
        if (loopBtnRef.current) {
          if (isRequested) {
            loopBtnRef.current.classList.add('animate-pulse', 'bg-orange-500/60', 'text-white');
            loopBtnRef.current.classList.remove('bg-[var(--cordel-wood)]', 'text-[#f4ecd8]', 'bg-[var(--cordel-bg)]', 'text-[var(--cordel-text)]');
            loopBtnRef.current.querySelector('.icon-repeat')?.classList.add('hidden');
            loopBtnRef.current.querySelector('.icon-arrow')?.classList.remove('hidden');
            loopBtnRef.current.querySelector('.loop-count')?.classList.add('hidden');
          } else {
            loopBtnRef.current.classList.remove('animate-pulse', 'bg-orange-500/60', 'text-white');
            loopBtnRef.current.querySelector('.icon-repeat')?.classList.remove('hidden');
            loopBtnRef.current.querySelector('.icon-arrow')?.classList.add('hidden');
            loopBtnRef.current.querySelector('.loop-count')?.classList.remove('hidden');
            if (useSequencerStore.getState().isLooping) {
              loopBtnRef.current.classList.add('bg-[var(--cordel-wood)]', 'text-[#f4ecd8]');
            } else {
              loopBtnRef.current.classList.add('bg-[var(--cordel-bg)]', 'text-[var(--cordel-text)]');
            }
          }
        }
      }
    );
    return unsub;
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (loopMenuRef.current && !loopMenuRef.current.contains(e.target as Node)) {
        setShowLoopMenu(false);
      }
    };
    if (showLoopMenu) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showLoopMenu]);

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

  const [displayBpm, setDisplayBpm] = React.useState(bpm);
  React.useEffect(() => {
    let animationFrameId: number;
    const updateBpm = () => {
      if (isPlaying) {
        setDisplayBpm(Math.round(Tone.Transport.bpm.value));
      } else {
        setDisplayBpm(bpm);
      }
      animationFrameId = requestAnimationFrame(updateBpm);
    };
    updateBpm();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, bpm]);

  return (
    <div className="w-full h-[60px] bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-4 z-[1000] shrink-0">
      
      {/* Left side: Metro, Swing, BPM */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden h-[30px]">
          <button
            onClick={() => setIsMetroOn(!isMetroOn)}
            className={`px-3 py-1 font-cactus font-bold text-sm flex items-center justify-center gap-2 h-full transition-colors cursor-pointer select-none ${
              isMetroOn ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/5'
            }`}
            title={t('metroBtn')}
            style={{ borderRadius: 0 }}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
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
            <span className="select-none hidden md:inline">
              {lang === 'fr' ? 'Métronome' : lang === 'pt' ? 'Metrônomo' : 'Metronome'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--cordel-bg)] px-2 py-1 cordel-border-sm border-[var(--cordel-border)]">
          <Gauge className="w-4 h-4 text-[var(--cordel-text)] md:hidden" />
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-sm select-none hidden md:inline">
            {lang === 'fr' ? 'Vitesse' : lang === 'pt' ? 'Velocidade' : 'Tempo'}
          </span>
          <span className="font-mono font-bold text-[var(--cordel-text)] text-xs ml-1 w-7 text-center">
            {displayBpm}
          </span>
          <div className="flex items-center gap-1 ml-1">
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
        
        <div className="relative flex items-center" ref={loopMenuRef}>
          <button
            ref={loopBtnRef}
            onClick={() => {
              if (isPlaying && sequencer.isLooping && loopMode === 'infinite') {
                useSequencerStore.getState().requestLoopExit();
              } else {
                sequencer.setIsLooping(!sequencer.isLooping);
              }
            }}
            className={`w-14 h-14 cordel-border cordel-button flex flex-col items-center justify-center cursor-pointer transition-all relative ${
              isLoopBypassed
                ? 'bg-orange-500 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' // Bypassed: orange active state
                : sequencer.isLooping 
                  ? sequencer.isLoopExitRequested
                    ? 'bg-orange-500/60 text-white animate-pulse'
                    : 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-border)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] opacity-60 hover:opacity-100'
            }`}
            title={lang === 'fr' ? 'Activer/Désactiver la boucle' : 'Toggle Loop'}
          >
            <Repeat className={`w-6 h-6 icon-repeat ${(!sequencer.isLooping || isLoopBypassed || sequencer.isLoopExitRequested) ? 'hidden' : ''}`} />
            <ArrowRightToLine className={`w-6 h-6 icon-arrow ${(sequencer.isLooping && !isLoopBypassed && !sequencer.isLoopExitRequested) ? 'hidden' : ''}`} />
            
            <span className={`text-[9px] font-bold mt-[-2px] loop-count ${(!sequencer.isLooping || isLoopBypassed || sequencer.isLoopExitRequested) ? 'hidden' : ''}`}>
              {loopMode === 'infinite' ? '∞' : Math.max(0, loopMode - currentLoopIteration + 1) + 'x'}
            </span>
          </button>
          
          <button
            onClick={() => setShowLoopMenu(!showLoopMenu)}
            className="w-4 h-14 cordel-border-sm cordel-button flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] ml-0.5"
            title={lang === 'fr' ? 'Paramètres de boucle' : 'Configurar loop'}
          >
            <span className="text-[10px]">▼</span>
          </button>

          {showLoopMenu && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 w-32 bg-[var(--cordel-bg)] cordel-border z-[1100] shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col">
              <button 
                onClick={() => { useSequencerStore.getState().setLoopMode('infinite'); setShowLoopMenu(false); }}
                className={`px-3 py-2 text-left text-sm font-bold border-b border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] ${loopMode === 'infinite' ? 'bg-[var(--cordel-wood)] text-[#f4ecd8]' : 'text-[var(--cordel-text)]'}`}
              >
                {lang === 'fr' ? '∞ Infini' : '∞ Infinito'}
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-b border-[var(--cordel-border)]">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={loopMode === 'infinite' ? 4 : loopMode}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      useSequencerStore.getState().setLoopMode(val);
                    }
                  }}
                  className="w-12 text-sm font-bold border-2 border-[var(--cordel-border)] px-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] outline-none focus:bg-[var(--cordel-border)]/10"
                />
                <span className="text-xs font-bold">{lang === 'fr' ? 'fois' : 'vezes'}</span>
              </div>
            </div>
          )}
        </div>

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
