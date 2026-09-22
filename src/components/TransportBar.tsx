/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, SkipBack, Circle, Repeat, ArrowRightToLine, Loader2, Gauge, ChevronDown, X } from 'lucide-react';
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
import { XiloLightning } from './XiloIcons';
import * as Tone from 'tone';

interface TransportBarProps {
  viewMode: 'roda' | 'console' | 'timeline';
}

const TransportBarComponent: React.FC<TransportBarProps> = ({ viewMode }) => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const sequencerSettings = useSequencerSettingsStore();

  const { lang, setBpm, isLeftHanded, setIsLeftHanded } = sequencer;
  
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

  const loopMode = useSequencerStore(state => state.loopMode);
  const currentLoopIteration = useSequencerStore(state => state.currentLoopIteration);
  const isLoopBypassed = useSequencerStore(state => state.isLoopBypassed);
  const isLoopExitRequested = useSequencerStore(state => state.isLoopExitRequested);

  const {
    isPlaying,
    handleTogglePlay,
    handleStop,
    handleAudioRecordingToggle,
    isRecording,
    recordingSeconds,
    stopSpeedTrainerAudio,
  } = audio;

  const isSpeedTrainerActive = useSequencerStore(state => state.isSpeedTrainerActive);
  const speedTrainerTourCount = useSequencerStore(state => state.speedTrainerTourCount);
  const speedTrainerCurrentBpm = useSequencerStore(state => state.speedTrainerCurrentBpm);
  const speedTrainerCountdown = useSequencerStore(state => state.speedTrainerCountdown);
  const openSpeedTrainerModal = useSequencerStore(state => state.openSpeedTrainerModal);

  const [showLoopMenu, setShowLoopMenu] = React.useState(false);
  const loopBtnRef = React.useRef<HTMLButtonElement>(null);
  const loopMenuRef = React.useRef<HTMLDivElement>(null);

  const [isPreRollPopupOpen, setIsPreRollPopupOpen] = React.useState(false);
  const metroContainerRef = React.useRef<HTMLDivElement>(null);
  const preRollSettings = useTransportStore((state) => state.preRollSettings);
  const setPreRollSettings = useTransportStore((state) => state.setPreRollSettings);
  const rhythmSignals = useSequencerStore((state) => state.metadata?.rhythmSignals || []);

  React.useEffect(() => {
    if (!isPreRollPopupOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (metroContainerRef.current && !metroContainerRef.current.contains(e.target as Node)) {
        setIsPreRollPopupOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreRollPopupOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreRollPopupOpen]);

  React.useEffect(() => {
    // Zero-Render-Thrashing feedback for loop exit
    // NOTE: The store does NOT use subscribeWithSelector middleware,
    // so we must manually compare previous vs current value.
    let prev = useSequencerStore.getState().isLoopExitRequested;
    const unsub = useSequencerStore.subscribe((state) => {
      const isRequested = state.isLoopExitRequested;
      if (isRequested === prev) return;
      prev = isRequested;
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
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (loopMenuRef.current && !loopMenuRef.current.contains(e.target as Node)) {
        setShowLoopMenu(false);
      }
    };
    if (showLoopMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
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


  return (
    <div className="w-full h-[60px] bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] relative flex flex-nowrap items-center justify-between px-2 sm:px-4 z-50 shrink-0 overflow-visible">
      
      {/* Left side: Metro, Swing, BPM */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="relative flex items-center bg-[var(--cordel-bg)] cordel-border-sm h-[30px]" ref={metroContainerRef}>
          {/* Bouton bascule audio métronome */}
          <button
            onClick={() => setIsMetroOn(!isMetroOn)}
            className={`px-2 sm:px-2.5 py-1 font-cactus font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 h-full transition-colors cursor-pointer select-none ${
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
            {preRollSettings.enabled && (
              <span className="px-1 py-0.2 bg-amber-600 text-white rounded text-[10px] font-sans font-bold leading-none shadow-xs">
                {preRollSettings.measuresCount}M
              </span>
            )}
          </button>

          {/* Déclencheur pop-up chevron */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPreRollPopupOpen(!isPreRollPopupOpen);
            }}
            className={`px-1.5 h-full flex items-center justify-center border-l border-[var(--cordel-border)]/30 hover:bg-[var(--cordel-text)]/10 cursor-pointer transition-colors ${
              isPreRollPopupOpen ? 'bg-[var(--cordel-text)]/15 text-[var(--cordel-text)]' : 'text-[var(--cordel-text)]'
            }`}
            title={lang === 'fr' ? 'Réglages du précompte' : 'Configurações de contagem'}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isPreRollPopupOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Pop-up rétractable cordel */}
          {isPreRollPopupOpen && (
            <div
              className="absolute bottom-[calc(100%+8px)] left-0 z-50 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-3 w-72 sm:w-80 select-none text-xs font-cactus animate-in fade-in zoom-in-95 duration-75"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#1a1a1a]/20 mb-2.5">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sm">
                  <span>⏱️</span>
                  <span>{lang === 'fr' ? 'Précompte (Pre-roll)' : 'Contagem (Pré-roll)'}</span>
                </div>
                <button
                  onClick={() => setIsPreRollPopupOpen(false)}
                  className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded cursor-pointer"
                  title={lang === 'fr' ? 'Fermer' : 'Fechar'}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Switch Armé / Désarmé */}
              <label className="flex items-center justify-between gap-2 p-1.5 bg-black/5 rounded cursor-pointer mb-2.5">
                <span className="font-bold text-xs">
                  {lang === 'fr' ? 'Activer le précompte au Play' : 'Ativar contagem ao iniciar'}
                </span>
                <input
                  type="checkbox"
                  checked={preRollSettings.enabled}
                  onChange={(e) => setPreRollSettings({ enabled: e.target.checked })}
                  className="w-4 h-4 accent-[var(--cordel-wood)] cursor-pointer"
                />
              </label>

              {/* Options lorsque précompte actif */}
              {preRollSettings.enabled && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-100">
                  {/* Nombre de mesures */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1 text-black/70">
                      {lang === 'fr' ? 'Durée du précompte :' : 'Duração da contagem :'}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreRollSettings({ measuresCount: 1 })}
                        className={`py-1 px-2 border border-[#1a1a1a] font-bold text-xs cursor-pointer transition-all ${
                          preRollSettings.measuresCount === 1
                            ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]'
                            : 'bg-white/60 hover:bg-white text-[#1a1a1a]'
                        }`}
                      >
                        1 {lang === 'fr' ? 'mesure' : 'compasso'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreRollSettings({ measuresCount: 2 })}
                        className={`py-1 px-2 border border-[#1a1a1a] font-bold text-xs cursor-pointer transition-all ${
                          preRollSettings.measuresCount === 2
                            ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]'
                            : 'bg-white/60 hover:bg-white text-[#1a1a1a]'
                        }`}
                      >
                        2 {lang === 'fr' ? 'mesures' : 'compassos'}
                      </button>
                    </div>
                  </div>

                  {/* Signaux d'amorce au départ M = 0 */}
                  <div className="border-t border-black/15 pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1 text-black/70">
                      {lang === 'fr' ? 'Signaux d’amorce au départ (M = 0) :' : 'Sinais de partida (M = 0) :'}
                    </div>

                    {preRollSettings.measuresCount === 2 && (
                      <div className="mb-2">
                        <label className="block text-[10px] font-bold text-black/60 mb-0.5">
                          {lang === 'fr' ? 'Mesure -2 (1ère mesure) :' : 'Compasso -2 (1º compasso) :'}
                        </label>
                        <select
                          value={preRollSettings.startSignalMeasure1Id || ''}
                          onChange={(e) => setPreRollSettings({ startSignalMeasure1Id: e.target.value || null })}
                          className="w-full bg-white/90 border border-[#1a1a1a] px-1.5 py-1 text-xs font-sans rounded-none cursor-pointer text-[#1a1a1a]"
                        >
                          <option value="">{lang === 'fr' ? 'Chiffré neutre (1, 2, 3, 4)' : 'Numérico neutro (1, 2, 3, 4)'}</option>
                          {rhythmSignals.map((sig) => (
                            <option key={sig.id} value={sig.id}>{sig.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-black/60 mb-0.5">
                        {preRollSettings.measuresCount === 2
                          ? (lang === 'fr' ? 'Mesure -1 (Appel immédiat) :' : 'Compasso -1 (Chamada imediata) :')
                          : (lang === 'fr' ? 'Mesure -1 (Signal d’appel) :' : 'Compasso -1 (Sinal de chamada) :')}
                      </label>
                      <select
                        value={preRollSettings.startSignalMeasure2Id || ''}
                        onChange={(e) => setPreRollSettings({ startSignalMeasure2Id: e.target.value || null })}
                        className="w-full bg-white/90 border border-[#1a1a1a] px-1.5 py-1 text-xs font-sans rounded-none cursor-pointer text-[#1a1a1a]"
                      >
                        <option value="">{lang === 'fr' ? 'Chiffré neutre (1, 2, 3, 4)' : 'Numérico neutro (1, 2, 3, 4)'}</option>
                        {rhythmSignals.map((sig) => (
                          <option key={sig.id} value={sig.id}>{sig.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Note contextuelle */}
                  <div className="text-[10px] text-black/60 italic leading-snug pt-1 border-t border-black/10">
                    💡 {lang === 'fr'
                      ? 'En cours de morceau (M > 0), le signal de la mesure précédente M-1 est automatiquement animé en amorce s’il existe.'
                      : 'Durante a música (M > 0), o sinal do compasso anterior M-1 é automaticamente animado se existir.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bouton de vélocité : icône / libellé + boutons +/- */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[var(--cordel-bg)] px-1.5 sm:px-2 py-1 cordel-border-sm border-[var(--cordel-border)]">
          <Gauge className="w-4 h-4 text-[var(--cordel-text)] md:hidden" />
          <span className="font-cactus font-bold text-[var(--cordel-text)] text-sm select-none hidden md:inline">
            {lang === 'fr' ? 'Vitesse' : lang === 'pt' ? 'Velocidade' : 'Tempo'}
          </span>
          <div className="flex items-center gap-1 ml-0.5 sm:ml-1">
            <button
              onPointerDown={(e) => { e.preventDefault(); startBpmChange(-1); }}
              onPointerUp={(e) => { e.preventDefault(); stopBpmChange(); }}
              onPointerLeave={(e) => { e.preventDefault(); stopBpmChange(); }}
              onPointerCancel={(e) => { e.preventDefault(); stopBpmChange(); }}
              className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 font-bold text-xs cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded-sm active:scale-95 transition-all select-none"
              title={lang === 'fr' ? 'Diminuer la vitesse' : lang === 'pt' ? 'Diminuir a velocidade' : 'Decrease speed'}
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
              title={lang === 'fr' ? 'Augmenter la vitesse' : lang === 'pt' ? 'Aumentar a velocidade' : 'Increase speed'}
              style={{ padding: 0, touchAction: 'none' }}
            >
              +
            </button>
          </div>
        </div>

        {/* Speed Trainer ⚡ Button / Live Indicator */}
        <button
          onClick={() => {
            if (isSpeedTrainerActive) {
              stopSpeedTrainerAudio();
            } else {
              openSpeedTrainerModal();
            }
          }}
          className={`h-[30px] px-2 sm:px-2.5 flex items-center gap-1.5 font-cactus font-bold text-xs select-none transition-all cordel-border-sm cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
            isSpeedTrainerActive
              ? 'bg-amber-500/20 text-amber-800 border-amber-600 animate-pulse'
              : 'bg-transparent text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/5'
          }`}
          title={
            isSpeedTrainerActive
              ? (lang === 'fr'
                  ? `Entraînement actif : Tour ${speedTrainerTourCount + 1} (${speedTrainerCurrentBpm} BPM). Cliquez pour arrêter et restaurer.`
                  : `Treino ativo: Volta ${speedTrainerTourCount + 1} (${speedTrainerCurrentBpm} BPM). Clique para parar e restaurar.`)
              : (lang === 'fr' ? 'Entraînement (Montée en vitesse)' : 'Treino (Aceleração de andamento)')
          }
        >
          <XiloLightning size={14} className="shrink-0 transition-colors" />
          {speedTrainerCountdown !== null ? (
            <span className="font-cactus font-bold text-amber-700 animate-bounce text-sm">
              {speedTrainerCountdown}
            </span>
          ) : isSpeedTrainerActive ? (
            <span className="font-cactus font-bold text-[11px] sm:text-xs">
              {lang === 'fr' ? `T${speedTrainerTourCount + 1} · ${speedTrainerCurrentBpm}` : `V${speedTrainerTourCount + 1} · ${speedTrainerCurrentBpm}`}
            </span>
          ) : (
            <span className="hidden lg:inline text-[var(--cordel-text)]">
              {lang === 'fr' ? 'Entraînement' : 'Treino'}
            </span>
          )}
        </button>
      </div>

      {/* Center/Right: Main Transport Controls
          - Sur smartphone (<sm): calé à droite (ml-auto)
          - Sur PC et tablette (>=sm): centrage absolu pile-poil avec jonction Lecture/Loop au milieu de l'écran
      */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 max-sm:ml-auto max-sm:justify-end sm:absolute sm:left-[calc(50%-9px)] sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2">
        <button
          onClick={handleStop}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors shrink-0"
          title={lang === 'pt' ? 'Voltar au início' : 'Retour au début'}
        >
          <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
        </button>
        
        {/* Play & Loop: Colles quasiment ensemble */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <button
            onClick={handleTogglePlay}
            disabled={audio.isLoading}
            className={`w-12 h-12 sm:w-14 sm:h-14 cordel-border cordel-button flex items-center justify-center transition-colors shrink-0 ${
              audio.isLoading ? 'bg-gray-400 text-gray-700 cursor-wait' : isPlaying ? 'bg-[#f1c40f] text-[#1a1a1a]' : 'bg-[var(--cordel-wood)] text-[#f4ecd8]'
            }`}
            title={audio.isLoading ? (lang === 'pt' ? 'Carregando sons...' : 'Chargement des sons...') : isPlaying ? (lang === 'pt' ? 'Pausar' : 'Pause') : (lang === 'pt' ? 'Tocar' : 'Lecture')}
          >
            {audio.isLoading ? <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" /> : isPlaying ? <Square className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5 sm:ml-1" fill="currentColor" />}
          </button>
          
          <div className="relative flex items-center shrink-0" ref={loopMenuRef}>
            <button
              ref={loopBtnRef}
              onClick={() => {
                const storeState = useSequencerStore.getState();
                if (isPlaying && sequencer.isLooping && !storeState.isLoopExitRequested) {
                  storeState.requestLoopExit();
                } else {
                  sequencer.setIsLooping(!sequencer.isLooping);
                  if (storeState.isLoopExitRequested) {
                    storeState.clearLoopExitRequest();
                  }
                }
              }}
              className={`w-12 h-12 sm:w-14 sm:h-14 cordel-border cordel-button flex flex-col items-center justify-center cursor-pointer transition-all relative shrink-0 ${
                isLoopBypassed
                  ? 'bg-orange-500 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' // Bypassed: orange active state
                  : sequencer.isLooping 
                    ? isLoopExitRequested
                      ? 'bg-orange-500/60 text-white animate-pulse'
                      : 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-border)]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] opacity-60 hover:opacity-100'
              }`}
              title={lang === 'fr' ? 'Activer/Désactiver la boucle' : 'Toggle Loop'}
            >
              <Repeat className={`w-5 h-5 sm:w-6 sm:h-6 icon-repeat ${(!sequencer.isLooping || isLoopBypassed || isLoopExitRequested) ? 'hidden' : ''}`} />
              <ArrowRightToLine className={`w-5 h-5 sm:w-6 sm:h-6 icon-arrow ${(sequencer.isLooping && !isLoopBypassed && !isLoopExitRequested) ? 'hidden' : ''}`} />
              
              <span className={`text-[8px] sm:text-[9px] font-bold mt-[-2px] loop-count ${(!sequencer.isLooping || isLoopBypassed || isLoopExitRequested) ? 'hidden' : ''}`}>
                {loopMode === 'infinite' ? '∞' : Math.max(0, loopMode - currentLoopIteration + 1) + 'x'}
              </span>
            </button>
            
            <button
              onClick={() => setShowLoopMenu(!showLoopMenu)}
              className="w-3.5 sm:w-4 h-12 sm:h-14 cordel-border-sm cordel-button flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] ml-0.5 shrink-0"
              title={lang === 'fr' ? 'Paramètres de boucle' : 'Configurar loop'}
            >
              <span className="text-[9px] sm:text-[10px]">▼</span>
            </button>

            {showLoopMenu && (
              <div className="absolute bottom-[calc(100%+8px)] right-0 sm:left-1/2 sm:-translate-x-1/2 w-36 bg-[var(--cordel-bg)] cordel-border z-50 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setShowLoopMenu(false);
                    }}
                    className="w-12 text-sm font-bold border-2 border-[var(--cordel-border)] px-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] outline-none focus:bg-[var(--cordel-border)]/10"
                  />
                  <span className="text-xs font-bold">{lang === 'fr' ? 'fois' : 'vezes'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 relative shrink-0">
          <button
            onClick={handleAudioRecordingToggle}
            className={`w-9 h-9 sm:w-10 sm:h-10 cordel-border cordel-button flex items-center justify-center transition-colors shrink-0 ${
              isRecording ? 'bg-red-600 text-white animate-pulse-red' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-red-100 hover:text-red-800'
            }`}
            title={lang === 'fr' ? "Exporter l'audio en WAV" : lang === 'pt' ? "Exportar áudio em WAV" : "Export Audio to WAV"}
          >
            <Circle className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
          </button>
          {isRecording && (
            <span className="font-mono text-red-600 dark:text-red-500 font-bold text-xs animate-pulse absolute left-11 sm:left-12 whitespace-nowrap bg-[var(--cordel-bg)] px-1.5 py-0.5 border border-red-600/30 shadow-[2px_2px_0_rgba(239,68,68,0.2)]">
              REC {formatRecordingTime(recordingSeconds)}
            </span>
          )}
        </div>
      </div>

    </div>
  );
};

export const TransportBar = React.memo(TransportBarComponent);
