import React, { useState, useEffect, useMemo, useRef } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { Play, Square, Clock, Award, ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';
import { audioEngine } from '../hooks/useAudioSync';
import { useAuth } from '../contexts/AuthContext';

interface SablierEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

const getInstrumentNameFromIdx = (idx: number) => {
  if (idx === 0) return 'alfaia';
  if (idx === 3) return 'caixa';
  if (idx === 5) return 'gongue';
  if (idx === 6) return 'agbe';
  return 'caixa';
};

export const SablierEngine: React.FC<SablierEngineProps> = ({
  lang,
  onExit,
  onSuccess,
  exerciseData
}) => {
  const { userProfile } = useAuth();
  
  // Data Extraction
  const targetInstrument = userProfile?.instrument || 'caixa';
  
  const seqFond = exerciseData?.sequence_fond || [];
  const seqCible = exerciseData?.sequence_cible || [];
  const seqPiege1 = exerciseData?.sequence_piege_1 || [];
  const seqPiege2 = exerciseData?.sequence_piege_2 || [];
  const seqPiege3 = exerciseData?.sequence_piege_3 || [];
  
  const bpm = exerciseData?.bpm || 83;
  const measures = exerciseData?.nombre_de_mesures || 2;
  const signImage = exerciseData?.image_main || '';
  
  // States
  const [gameState, setGameState] = useState<'idle' | 'playing_base' | 'sablier_active' | 'success' | 'failure'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(0); // remaining measures for sablier
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(null);
  const [options, setOptions] = useState<{ id: number, type: 'cible' | 'piege1' | 'piege2' | 'piege3', track: any }[]>([]);
  const [isSoloPlaying, setIsSoloPlaying] = useState<number | null>(null);

  // References
  const baseEventRef = useRef<number | null>(null);
  const sablierTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute Options once
  useEffect(() => {
    // Isolate student instrument track from each sequence
    const tCible = seqCible.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    const tP1 = seqPiege1.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    const tP2 = seqPiege2.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    const tP3 = seqPiege3.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    
    // Create pool
    const pool = [
      { id: 0, type: 'cible' as const, track: tCible },
      { id: 1, type: 'piege1' as const, track: tP1 },
      { id: 2, type: 'piege2' as const, track: tP2 },
      { id: 3, type: 'piege3' as const, track: tP3 },
    ].filter(o => o.track); // ensure it exists

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setOptions(pool);
  }, [seqCible, seqPiege1, seqPiege2, seqPiege3, targetInstrument]);

  // Audio Scheduling Helper
  const scheduleSequence = (tracks: any[], startTimeStr: string, isLoop: boolean, loopStart: string, loopEnd: string) => {
    tracks.forEach(track => {
      if (track.isMute) return;
      const steps = track.patterns[0]?.activeSteps || [];
      const instName = getInstrumentNameFromIdx(track.instrumentIdx);
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step !== 0 && step !== '0' && step !== null) {
          const m = Math.floor(i / 16);
          const beat = Math.floor((i % 16) / 4);
          const sixteenth = (i % 16) % 4;
          const timeStr = `${m}:${beat}:${sixteenth}`;
          
          safeGetTone()?.Transport.schedule((time) => {
            audioEngine.playNote(instName, step, time, 1.0, 1.0);
          }, timeStr);
        }
      }
    });

    if (safeGetTone()) safeGetTone()!.Transport.bpm.value = bpm;
    if (isLoop) {
      safeGetTone()?.Transport.setLoopPoints(loopStart, loopEnd);
      if (safeGetTone()) safeGetTone()!.Transport.loop = true;
    } else {
      if (safeGetTone()) safeGetTone()!.Transport.loop = false;
    }
  };

  const playBaseLoop = () => {
    safeGetTone()?.Transport.cancel();
    safeGetTone()?.Transport.stop();
    
    scheduleSequence(seqFond, "0:0:0", true, "0:0:0", `${measures}:0:0`);
    
    if (safeGetTone()?.context.state !== 'running') {
      safeGetTone()?.context.resume();
    }
    
    // Play for 1 loop (measures), then start sablier
    safeGetTone()?.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    setGameState('playing_base');

    const durationMs = (measures * 4 * 60 * 1000) / bpm;
    setTimeout(() => {
      if (safeGetTone()?.Transport.state === 'started') {
        startSablier();
      }
    }, durationMs);
  };

  const startSablier = () => {
    setGameState('sablier_active');
    let timeLeftLocal = 2; // Sablier lasts for 2 measures
    setTimeLeft(timeLeftLocal);

    const measureDurationMs = (4 * 60 * 1000) / bpm;
    
    sablierTimerRef.current = setInterval(() => {
      timeLeftLocal -= 1;
      setTimeLeft(timeLeftLocal);
      
      if (timeLeftLocal <= 0) {
        clearInterval(sablierTimerRef.current as NodeJS.Timeout);
        // Timeout!
        handleFailure();
      }
    }, measureDurationMs);
  };

  const handleValidation = (optionType: string) => {
    if (gameState !== 'sablier_active') return;
    
    if (sablierTimerRef.current) {
      clearInterval(sablierTimerRef.current);
    }

    if (optionType === 'cible') {
      // Success! Play Target Sequence seamlessly
      setGameState('success');
      playTargetSequence();
    } else {
      // Failure
      handleFailure();
    }
  };

  const playTargetSequence = () => {
    // We want to seamlessly transition to seqCible at the end of the current measure/loop.
    // To make it simple, we stop Transport, schedule seqCible, and play it.
    safeGetTone()?.Transport.cancel();
    safeGetTone()?.Transport.stop();
    
    scheduleSequence(seqCible, "0:0:0", false, "0:0:0", "0:0:0");
    safeGetTone()?.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    
    const durationMs = (measures * 4 * 60 * 1000) / bpm;
    setTimeout(() => {
      safeGetTone()?.Transport.stop();
      onSuccess?.();
    }, durationMs + 500);
  };

  const handleFailure = async () => {
    setGameState('failure');
    safeGetTone()?.Transport.cancel();
    safeGetTone()?.Transport.stop();

    try {
      const res = await fetch('/presets/fatras.json');
      const fatras = await res.json();
      
      scheduleSequence(fatras.tracks, "0:0:0", false, "0:0:0", "0:0:0");
      if (safeGetTone()) safeGetTone()!.Transport.bpm.value = fatras.bpm || 150;
      safeGetTone()?.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
      
      const meas = fatras.totalMeasures || 1;
      const durMs = (meas * 4 * 60 * 1000) / fatras.bpm;
      setTimeout(() => {
        safeGetTone()?.Transport.stop();
        setGameState('idle'); // allow restart?
      }, durMs + 500);
    } catch (e) {
      console.error(e);
      setGameState('idle');
    }
  };

  const playSoloOption = (option: any) => {
    if (isSoloPlaying === option.id) {
      safeGetTone()?.Transport.stop();
      safeGetTone()?.Transport.cancel();
      setIsSoloPlaying(null);
      // Resume base if we are in active state? No, pre-listening is only available when idle?
      // Actually, user should be able to pre-listen BEFORE clicking play.
      return;
    }

    // Stop current
    safeGetTone()?.Transport.stop();
    safeGetTone()?.Transport.cancel();
    
    if (gameState === 'playing_base' || gameState === 'sablier_active') {
       // Cannot pre-listen while game is active
       alert(lang === 'fr' ? "Impossible pendant le jeu !" : "Não é possível durante o jogo!");
       return;
    }

    scheduleSequence([option.track], "0:0:0", false, "0:0:0", "0:0:0");
    if (safeGetTone()) safeGetTone()!.Transport.bpm.value = bpm;
    safeGetTone()?.Transport.start(`+${audioEngine['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    setIsSoloPlaying(option.id);

    const durationMs = (measures * 4 * 60 * 1000) / bpm;
    setTimeout(() => {
      safeGetTone()?.Transport.stop();
      setIsSoloPlaying(null);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (sablierTimerRef.current) clearInterval(sablierTimerRef.current);
      safeGetTone()?.Transport.stop();
      safeGetTone()?.Transport.cancel();
    };
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto cordel-bg select-none font-sans flex flex-col p-4 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-4 mb-6 relative">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'fr' ? 'Retour' : 'Voltar'}
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="font-cactus text-3xl uppercase tracking-wider text-[var(--cordel-text)] font-extrabold flex items-center gap-2">
            <Clock className="w-8 h-8" />
            {exerciseData?.folheto_titre || "Le Sablier"}
          </h2>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full max-w-6xl mx-auto w-full">
        {/* Left Column: Sign & Timer */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] p-6 cordel-border flex flex-col items-center justify-center gap-4 text-center min-h-[300px] relative overflow-hidden">
            
            {/* Background Animation for Sablier */}
            {gameState === 'sablier_active' && (
              <div 
                className="absolute bottom-0 left-0 right-0 bg-red-500/20 transition-all duration-1000 ease-linear"
                style={{ height: `${(timeLeft / 2) * 100}%` }}
              />
            )}

            <Clock className={`w-16 h-16 transition-all ${gameState === 'sablier_active' ? 'text-red-500 animate-pulse' : 'text-[var(--cordel-wood)]'}`} />
            
            <h3 className="font-cactus text-xl font-bold text-[var(--cordel-wood)] z-10">
              {gameState === 'idle' && (lang === 'fr' ? "Prêt ?" : "Pronto ?")}
              {gameState === 'playing_base' && (lang === 'fr' ? "Écoutez la base..." : "Ouça a base...")}
              {gameState === 'sablier_active' && (lang === 'fr' ? "Vite ! Choisissez la suite !" : "Rápido! Escolha a continuação!")}
              {gameState === 'success' && (lang === 'fr' ? "Bravo !" : "Parabéns!")}
              {gameState === 'failure' && (lang === 'fr' ? "Temps écoulé ou erreur !" : "Tempo esgotado ou erro!")}
            </h3>

            {gameState === 'sablier_active' && signImage && (
              <div className="z-10 animate-bounce mt-4">
                <img src={signImage} alt="Signe" className="max-h-32 object-contain border-4 border-red-500 rounded p-1 bg-white" />
              </div>
            )}

            {gameState === 'idle' && (
              <button
                onClick={playBaseLoop}
                className="mt-6 px-8 py-3 bg-[var(--cordel-wood)] text-white font-cactus font-bold text-lg uppercase cordel-button cursor-pointer flex items-center gap-2 hover:opacity-90"
              >
                <Play className="w-5 h-5 fill-current" />
                {lang === 'fr' ? "Commencer" : "Começar"}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Choices */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="border-2 border-[var(--cordel-border)] p-6 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-6">
            <h3 className="font-cactus text-lg font-bold text-[var(--cordel-wood)] border-b-2 border-dashed border-[var(--cordel-wood)]/30 pb-2">
              {lang === 'fr' ? `Options (${targetInstrument.toUpperCase()})` : `Opções (${targetInstrument.toUpperCase()})`}
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-4 bg-black/5 p-3 rounded border border-[var(--cordel-border)]/20">
                  <button
                    onClick={() => playSoloOption(opt)}
                    disabled={gameState !== 'idle'}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-[var(--cordel-border)] cordel-button ${
                      isSoloPlaying === opt.id ? 'bg-[var(--cordel-wood)] text-white' : 'bg-white text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-white'
                    } ${gameState !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title="Pré-écoute"
                  >
                    {isSoloPlaying === opt.id ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  
                  {/* Visualizer (Simple Blocks) */}
                  <div className="flex-1 flex gap-1 items-center h-8 bg-white border border-[var(--cordel-border)]/30 p-1">
                    {opt.track.patterns[0].activeSteps.map((step: any, sIdx: number) => (
                       <div key={sIdx} className={`h-full flex-1 ${(step !== 0 && step !== '0' && step !== null) ? 'bg-[var(--cordel-wood)]' : 'bg-transparent'}`} />
                    ))}
                  </div>

                  <button
                    onClick={() => handleValidation(opt.type)}
                    disabled={gameState !== 'sablier_active'}
                    className={`px-6 py-2 font-cactus font-bold uppercase border-2 cordel-button ${
                      gameState === 'sablier_active' 
                        ? 'bg-[#27ae60] text-white border-[#27ae60] cursor-pointer animate-pulse'
                        : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {lang === 'fr' ? "C'est ça !" : "É esse!"}
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
