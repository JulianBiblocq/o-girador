import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, RotateCcw, ArrowRight, Check, X, Award, Activity, ShieldAlert } from 'lucide-react';
import { rhythmLivePattern, RhythmLivePattern } from '../data/rythmeLiveData';
import { ASSETS_BASE_URL } from '../data';

interface RythmeLiveEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

interface HitDetail {
  hitTime: number; // in seconds relative to play start
  diff: number; // difference in seconds (hitTime - targetTime)
  rating: 'perfect' | 'medium' | 'miss';
}

export const RythmeLiveEngine: React.FC<RythmeLiveEngineProps> = ({ lang, onExit, onSuccess, exerciseData }) => {
  const exercisesList = React.useMemo(() => {
    if (!exerciseData) return [rhythmLivePattern];
    if (exerciseData.exercises && Array.isArray(exerciseData.exercises)) {
      return exerciseData.exercises.map((ex: any) => {
        let targetSteps: number[] = [];
        if (ex.partition_cible && ex.partition_cible.length > 0) {
           ex.partition_cible.forEach((t: any) => {
             // For RythmeLive, we find the active steps.
             t.activeSteps.forEach((val: number, idx: number) => {
                if (val > 0) targetSteps.push(idx);
             });
           });
        }
        
        const baseSteps = Array.from(new Set(targetSteps)).sort((a,b)=>a-b);
        const fullTargetSteps: number[] = [];
        const measures = ex.boucles_requises || 2;
        for (let m = 0; m < measures; m++) {
           baseSteps.forEach(s => fullTargetSteps.push(m * 16 + s));
        }

        return {
          id: ex.id,
          name: { fr: 'Exercice Rythme Live', pt: 'Exercício Ritmo Ao Vivo' },
          targetInstrument: ex.instrument_eleve || 'caixa',
          bpm: ex.bpm || 83,
          totalMeasures: measures,
          stepsPerMeasure: 16,
          targetSteps: fullTargetSteps,
          toleranceMs: ex.tolerance_ms || 80
        };
      });
    }
    return [rhythmLivePattern];
  }, [exerciseData]);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const currentPattern = exercisesList[currentExerciseIndex];

  // Game state
  const [gameStatus, setGameStatus] = useState<'idle' | 'countdown' | 'playing' | 'finished'>('idle');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [hitDetails, setHitDetails] = useState<(HitDetail | null)[]>([]);

  useEffect(() => {
    setHitDetails(new Array(currentPattern.targetSteps.length).fill(null));
  }, [currentPattern]);
  
  // Real-time flash feedback
  const [flashState, setFlashState] = useState<{
    type: 'perfect' | 'medium' | 'miss';
    message: string;
    key: number;
  } | null>(null);

  // Refs for low-latency handlers and Tone.js callbacks
  const gameStatusRef = useRef(gameStatus);
  const playStartTimeRef = useRef<number>(0);
  const hitDetailsRef = useRef<(HitDetail | null)[]>([]);
  const scheduledEventIdsRef = useRef<number[]>([]);
  const clickSynthRef = useRef<Tone.Synth | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);

  // Keep refs synchronized with state
  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    hitDetailsRef.current = hitDetails;
  }, [hitDetails]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanUpAudio();
    };
  }, []);

  const cleanUpAudio = () => {
    // 1. Cancel requestAnimationFrame
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    // 2. Clear all scheduled Tone Transport events
    scheduledEventIdsRef.current.forEach((id) => {
      try {
        Tone.Transport.clear(id);
      } catch (_) {}
    });
    scheduledEventIdsRef.current = [];

    // 3. Dispose local synth
    if (clickSynthRef.current) {
      try {
        clickSynthRef.current.dispose();
      } catch (_) {}
      clickSynthRef.current = null;
    }

    // 4. Stop Transport
    try {
      Tone.Transport.stop();
    } catch (_) {}
  };

  const startGame = async () => {
    // Reset state
    cleanUpAudio();
    setGameStatus('countdown');
    setCountdownValue(4);
    setProgress(0);
    setHitDetails(new Array(currentPattern.targetSteps.length).fill(null));
    setFlashState(null);
    lastHitTimeRef.current = 0;

    // Start Audio Context if suspended
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    // Create click synth for the countdown
    clickSynthRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -6
    }).toDestination();

    // Set Transport BPM to target
    Tone.Transport.bpm.value = currentPattern.bpm;
    
    // Make sure Transport is playing
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }

    const t0 = Tone.Transport.seconds + 0.1; // 100ms padding
    const beatDuration = 60 / currentPattern.bpm;

    // 1. Schedule the 4 countdown beats
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatDuration;
      const eventId = Tone.Transport.schedule((time) => {
        if (clickSynthRef.current) {
          // Play higher beep on last countdown beat
          clickSynthRef.current.triggerAttackRelease(i === 3 ? "A5" : "E5", "16n", time);
        }
        Tone.Draw.schedule(() => {
          setCountdownValue(4 - i);
        }, time);
      }, clickTime);
      scheduledEventIdsRef.current.push(eventId);
    }

    // 2. Schedule Start of Play Phase
    const playStartTime = t0 + 4 * beatDuration;
    playStartTimeRef.current = playStartTime;

    const playStartEventId = Tone.Transport.schedule((time) => {
      if (clickSynthRef.current) {
        // High beep signifying start
        clickSynthRef.current.triggerAttackRelease("E6", "16n", time);
      }
      Tone.Draw.schedule(() => {
        setCountdownValue(null);
        setGameStatus('playing');
      }, time);
    }, playStartTime);
    scheduledEventIdsRef.current.push(playStartEventId);

    // 3. Start progress animation loop
    const totalDuration = currentPattern.totalMeasures * 4 * beatDuration;
    const playEndTime = playStartTime + totalDuration;

    const updatePlayhead = () => {
      if (gameStatusRef.current !== 'playing') return;
      
      const elapsed = Tone.Transport.seconds - playStartTimeRef.current;
      const currentProgress = Math.min(1, Math.max(0, elapsed / totalDuration));
      
      setProgress(currentProgress);

      if (currentProgress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(updatePlayhead);
      }
    };

    // Trigger animation loop slightly before playStartTime to ensure smooth transition
    const animationTriggerEventId = Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        animationFrameIdRef.current = requestAnimationFrame(updatePlayhead);
      }, time);
    }, playStartTime - 0.05);
    scheduledEventIdsRef.current.push(animationTriggerEventId);

    // 4. Schedule Game End and evaluation
    const playEndEventId = Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        // Complete remaining missed notes
        const currentDetails = [...hitDetailsRef.current];
        const finalDetails = currentDetails.map((detail) => {
          if (detail === null) {
            return { hitTime: -1, diff: -1, rating: 'miss' as const };
          }
          return detail;
        });
        setHitDetails(finalDetails);
        setGameStatus('finished');
        cleanUpAudio();
      }, time);
    }, playEndTime);
    scheduledEventIdsRef.current.push(playEndEventId);
  };

  const handleUserHit = (elapsed: number) => {
    const beatDuration = 60 / currentPattern.bpm;
    const stepDuration = beatDuration / (currentPattern.stepsPerMeasure / 4);
    const targets = currentPattern.targetSteps.map((step: number) => step * stepDuration);

    let closestIdx = -1;
    let minDiff = Infinity;

    // Find the closest target step that hasn't been hit yet
    for (let i = 0; i < targets.length; i++) {
      if (hitDetailsRef.current[i] !== null) continue; // Skip already matched notes
      const diff = Math.abs(targets[i] - elapsed);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    // Matching window: must be within 150ms of any target step
    const matchWindow = 0.150;
    if (closestIdx !== -1 && minDiff <= matchWindow) {
      const diff = elapsed - targets[closestIdx]; // Negative = early, Positive = late
      let rating: 'perfect' | 'medium' | 'miss' = 'miss';
      let message = '';

      if (minDiff <= 0.030) {
        rating = 'perfect';
        message = lang === 'fr' ? 'PARFAIT !' : 'PERFEITO !';
      } else if (minDiff <= 0.080) {
        rating = 'medium';
        message = lang === 'fr' ? 'MOYEN' : 'MÉDIO';
      } else {
        rating = 'miss';
        message = lang === 'fr' ? 'HORS TEMPS' : 'FORA DE COMPASSO';
      }

      // Record hit detail
      const updatedDetails = [...hitDetailsRef.current];
      updatedDetails[closestIdx] = { hitTime: elapsed, diff, rating };
      setHitDetails(updatedDetails);

      // Trigger visual flash
      setFlashState({
        type: rating,
        message: `${message} (${diff > 0 ? '+' : ''}${Math.round(diff * 1000)}ms)`,
        key: Math.random()
      });
    } else {
      // Hit is completely off-beat
      setFlashState({
        type: 'miss',
        message: lang === 'fr' ? 'HORS TEMPS' : 'FORA DE COMPASSO',
        key: Math.random()
      });
    }
  };

  const triggerHit = (e?: React.SyntheticEvent | KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (gameStatusRef.current !== 'playing') return;

    const now = Tone.Transport.seconds;
    const elapsed = now - playStartTimeRef.current;

    // Debounce to prevent multiple fires within 40ms (keyboard repeat/multi-touch issues)
    if (now - lastHitTimeRef.current < 0.040) {
      return;
    }
    lastHitTimeRef.current = now;

    handleUserHit(elapsed);
  };

  // Keyboard Space listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        triggerHit(e);
      }
    };

    if (gameStatus === 'playing') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStatus]);

  // Calculations for results screen
  const perfectCount = hitDetails.filter((d) => d?.rating === 'perfect').length;
  const mediumCount = hitDetails.filter((d) => d?.rating === 'medium').length;
  const missCount = hitDetails.filter((d) => d?.rating === 'miss' || d === null).length;
  const totalNotes = currentPattern.targetSteps.length;
  
  // Score: Perfect = 100% points, Medium = 50% points, Miss = 0%
  const scorePercent = totalNotes > 0 
    ? Math.max(0, Math.round(((perfectCount * 1.0 + mediumCount * 0.5) / totalNotes) * 100))
    : 0;

  useEffect(() => {
    if (gameStatus === 'finished') {
      if (scorePercent >= 90) {
        onSuccess?.();
      }
    }
  }, [gameStatus, scorePercent, onSuccess]);

  // Grade badge translation
  const getBadge = () => {
    if (scorePercent >= 90) return { title: lang === 'fr' ? 'Mestre de Bateria' : 'Mestre de Bateria', desc: lang === 'fr' ? 'Rythme impeccable, digne des plus grands maîtres !' : 'Ritmo impecável, digno dos maiores mestres !', color: 'text-green-600 border-green-600 bg-green-500/10' };
    if (scorePercent >= 70) return { title: lang === 'fr' ? 'Batuqueiro Expérimenté' : 'Batuqueiro Experiente', desc: lang === 'fr' ? 'Superbe cadence, vous portez le cortège avec force !' : 'Superba cadência, você carrega o cortejo com força !', color: 'text-yellow-600 border-yellow-600 bg-yellow-500/10' };
    if (scorePercent >= 40) return { title: lang === 'fr' ? 'Batuqueiro Initié' : 'Batuqueiro Iniciante', desc: lang === 'fr' ? 'Bon début, continuez à écouter la pulsation !' : 'Bom começo, continue ouvindo a pulsação !', color: 'text-amber-700 border-amber-700 bg-amber-600/10' };
    return { title: lang === 'fr' ? 'Bébé Alfaia' : 'Bebê Alfaia', desc: lang === 'fr' ? 'Entraînez-vous encore pour accorder vos battements.' : 'Treine mais para afinar suas batidas.', color: 'text-[var(--cordel-wood)] border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10' };
  };

  const badge = getBadge();

  // Translations
  const t = {
    fr: {
      title: "Rythme Live",
      subtitle: "Mesure de précision en temps réel",
      instTitle: "Comment jouer ?",
      instLine1: "1. Écoutez le décompte sonore strict (4 temps) pour vous caler.",
      instLine2: "2. Dès le signal de départ, frappez le motif rythmique de Caixa (Huitième de note).",
      instLine3: "3. Appuyez sur ESPACE (clavier) ou touchez la zone de frappe géante (mobile).",
      instLine4: "⚠️ Aucun son ne sera joué lors de vos frappes pour éviter le décalage Bluetooth.",
      tempoLabel: "BPM recommandé :",
      startBtn: "Démarrer le test",
      tapZoneLabel: "FRAPPEZ ICI !",
      tapZoneActive: "BATTEZ LE RYTHME !",
      keyboardHint: "(Ou appuyez sur la touche ESPACE)",
      countdownReady: "PRÊT ?",
      resultsTitle: "Bilan Rythmique",
      resultsSubtitle: "Résultats de votre performance",
      perfectLabel: "Parfait",
      mediumLabel: "Moyen",
      missedLabel: "Raté",
      restartBtn: "Recommencer",
      exitBtn: "Quitter"
    },
    pt: {
      title: "Ritmo Live",
      subtitle: "Medição de precisão em tempo real",
      instTitle: "Como jogar ?",
      instLine1: "1. Ouça a contagem sonora estrita (4 tempos) para se situar.",
      instLine2: "2. No sinal de início, toque o padrão rítmico da Caixa (Colcheias).",
      instLine3: "3. Pressione ESPAÇO (teclado) ou toque na área de toque gigante (celular).",
      instLine4: "⚠️ Nenhum som será tocado ao tocar para evitar atrasos no Bluetooth.",
      tempoLabel: "BPM recomendado :",
      startBtn: "Iniciar o teste",
      tapZoneLabel: "TOQUE AQUI !",
      tapZoneActive: "BATUQUE NO RITMO !",
      keyboardHint: "(Ou pressione a tecla ESPAÇO)",
      countdownReady: "PREPARADO ?",
      resultsTitle: "Resultado Rítmico",
      resultsSubtitle: "Resultados da sua performance",
      perfectLabel: "Perfeito",
      mediumLabel: "Médio",
      missedLabel: "Erro",
      restartBtn: "Tentar Novamente",
      exitBtn: "Sair"
    }
  }[lang];

  return (
    <div className="w-full max-w-xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🎮 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
        >
          {t.exitBtn}
        </button>
      </div>

      {/* Instruction screen */}
      {gameStatus === 'idle' && (
        <div className="flex flex-col gap-4 p-4 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border">
          <h3 className="font-cactus text-sm font-bold uppercase tracking-wider text-[var(--cordel-text)] border-b-2 border-dashed border-[var(--cordel-border)] pb-1 flex items-center gap-1.5">
            📝 {t.instTitle}
          </h3>
          <ul className="text-xs text-[var(--cordel-text)]/85 flex flex-col gap-2.5 leading-relaxed font-cactus">
            <li>{t.instLine1}</li>
            <li>{t.instLine2}</li>
            <li>{t.instLine3}</li>
            <li className="font-bold text-[var(--cordel-wood)] flex items-start gap-1">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[var(--cordel-wood)]" />
              <span>{t.instLine4}</span>
            </li>
          </ul>

          {/* Pattern Visualiser (Woodcut steps grid) */}
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--cordel-text)]/60">
              {lang === 'fr' ? 'Partition cible (Caixa)' : 'Partitura alvo (Caixa)'}
            </span>
            <div className="grid grid-cols-8 gap-1 p-2 bg-[var(--cordel-text)]/5 border border-[var(--cordel-border)]">
              {Array.from({ length: 32 }).map((_, stepIdx) => {
                const isTarget = currentPattern.targetSteps.includes(stepIdx);
                const beatIdx = Math.floor(stepIdx / 4) + 1;
                const isBeatStart = stepIdx % 4 === 0;

                return (
                  <div
                    key={stepIdx}
                    className={`h-7 flex flex-col items-center justify-between p-0.5 border ${
                      isTarget 
                        ? 'border-[var(--cordel-border)] bg-[var(--cordel-wood)] text-[var(--cordel-bg)]'
                        : 'border-[var(--cordel-border)]/20 bg-transparent text-[var(--cordel-text)]/40'
                    }`}
                  >
                    <span className="text-[7px] font-mono leading-none">
                      {isBeatStart ? `T${beatIdx}` : ''}
                    </span>
                    <span className="text-[9px] font-black leading-none">
                      {isTarget ? 'X' : '.'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[9px] text-[var(--cordel-text)]/70 font-semibold mt-1">
              <span>{t.tempoLabel} {currentPattern.bpm} BPM</span>
              <span>{lang === 'fr' ? `${currentPattern.totalMeasures} mesures` : `${currentPattern.totalMeasures} compassos`} ({currentPattern.targetSteps.length} {lang === 'fr' ? 'frappes' : 'toques'})</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full mt-2 py-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus text-sm font-bold uppercase cordel-border hover:opacity-90 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            {t.startBtn}
          </button>
        </div>
      )}

      {/* Countdown overlay screen */}
      {gameStatus === 'countdown' && (
        <div className="flex flex-col items-center justify-center p-8 border-4 border-[var(--cordel-border)] bg-[var(--cordel-bg)] shadow-[6px_6px_0_var(--cordel-border)] text-center relative h-64">
          <span className="text-xs uppercase tracking-widest text-[var(--cordel-text)]/50 font-bold mb-4">
            {t.countdownReady}
          </span>
          <div className="w-24 h-24 rounded-full border-4 border-dashed border-[var(--cordel-border)] flex items-center justify-center bg-[var(--cordel-text)]/5 animate-pulse">
            <span className="font-cactus text-5xl font-black text-[var(--cordel-text)]">
              {countdownValue}
            </span>
          </div>
        </div>
      )}

      {/* Playing Game Screen */}
      {gameStatus === 'playing' && (
        <div className="flex flex-col gap-4">
          {/* Scrollable / animated playhead timeline */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-[var(--cordel-text)]/70 font-bold">
              <span>{lang === 'fr' ? 'Mesure 1' : 'Compasso 1'}</span>
              <span>{lang === 'fr' ? 'Mesure 2' : 'Compasso 2'}</span>
            </div>
            
            <div className="relative w-full h-10 bg-[var(--cordel-text)]/5 border-3 border-[var(--cordel-border)] rounded-sm overflow-hidden flex items-center">
              {/* Beats dividers */}
              {Array.from({ length: 8 }).map((_, beatIdx) => (
                <div
                  key={beatIdx}
                  className="absolute top-0 bottom-0 border-l border-dashed border-[var(--cordel-border)]/25"
                  style={{ left: `${(beatIdx / 8) * 100}%` }}
                />
              ))}

              {/* Target steps markers */}
              {currentPattern.targetSteps.map((stepIdx: number, idx: number) => {
                const totalTimelineSteps = currentPattern.totalMeasures * 16;
                const stepPos = (stepIdx / totalTimelineSteps) * 100;
                const hit = hitDetails[idx];
                
                let markerBg = 'bg-[var(--cordel-bg)]';
                let markerText = 'text-[var(--cordel-text)]';
                let markerBorder = 'border-[var(--cordel-border)]';
                
                if (hit !== null) {
                  if (hit.rating === 'perfect') {
                    markerBg = 'bg-green-600';
                    markerText = 'text-white';
                    markerBorder = 'border-green-800';
                  } else if (hit.rating === 'medium') {
                    markerBg = 'bg-yellow-500';
                    markerText = 'text-black';
                    markerBorder = 'border-yellow-700';
                  } else {
                    markerBg = 'bg-[var(--cordel-wood)]';
                    markerText = 'text-white';
                    markerBorder = 'border-black';
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`absolute w-6 h-6 -ml-3 rounded-full border-2 flex items-center justify-center font-mono text-[9px] font-black z-10 shadow-sm transition-all duration-100 ${markerBg} ${markerText} ${markerBorder}`}
                    style={{ left: `${stepPos}%` }}
                  >
                    {hit ? (hit.rating === 'perfect' ? '★' : hit.rating === 'medium' ? '✓' : '✗') : idx + 1}
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-[var(--cordel-wood)] z-20 shadow-[0_0_8px_var(--cordel-wood)] pointer-events-none"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Interactive Tap Area (Low-Latency Input Zone) */}
          <div
            onTouchStart={triggerHit}
            onMouseDown={triggerHit}
            className={`w-full h-48 border-4 border-[var(--cordel-border)] flex flex-col items-center justify-center relative cursor-pointer active:translate-y-0.5 select-none transition-colors duration-100 shadow-[6px_6px_0_var(--cordel-border)] rounded-sm ${
              flashState?.type === 'perfect' 
                ? 'bg-green-700/20' 
                : flashState?.type === 'medium' 
                ? 'bg-yellow-600/20' 
                : flashState?.type === 'miss' 
                ? 'bg-[var(--cordel-wood)]/20' 
                : 'bg-[var(--cordel-bg)]'
            }`}
          >
            {/* Visual hatch / woodcut border elements inside tap zone */}
            <div className="absolute inset-1 border border-dashed border-[var(--cordel-border)]/40 pointer-events-none" />

            <div className="flex flex-col items-center justify-center z-10 pointer-events-none">
              <span className="text-4xl filter drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">🥁</span>
              <span className="font-cactus text-lg font-black uppercase tracking-wider text-[var(--cordel-text)] mt-3">
                {t.tapZoneActive}
              </span>
              <span className="text-[10px] text-[var(--cordel-text)]/60 font-semibold mt-1">
                {t.keyboardHint}
              </span>
            </div>

            {/* Float-up real-time rating feedback stamp */}
            {flashState && (
              <div
                key={flashState.key}
                className={`absolute z-30 font-cactus font-black text-lg px-4 py-2 border-3 border-dashed uppercase rotate-[-8deg] pointer-events-none animate-bounce bg-[var(--cordel-bg)]/95 shadow-md ${
                  flashState.type === 'perfect'
                    ? 'text-green-600 border-green-600'
                    : flashState.type === 'medium'
                    ? 'text-yellow-600 border-yellow-600'
                    : 'text-[var(--cordel-wood)] border-[var(--cordel-wood)]'
                }`}
              >
                {flashState.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bilan / Results Screen */}
      {gameStatus === 'finished' && (
        <div className="flex flex-col gap-5 p-4 border-3 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border shadow-[6px_6px_0_var(--cordel-border)]">
          {/* Header Bilan */}
          <div className="text-center border-b-2 border-dashed border-[var(--cordel-border)] pb-3">
            <h3 className="font-cactus text-base font-black uppercase tracking-wider text-[var(--cordel-text)] flex items-center justify-center gap-2">
              🏆 {t.resultsTitle}
            </h3>
            <span className="text-[10px] text-[var(--cordel-text)]/75 font-semibold">
              {t.resultsSubtitle}
            </span>
          </div>

          {/* Score Circle & Badge stamp */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-2">
            {/* Score Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center border-4 border-[var(--cordel-border)] bg-[var(--cordel-text)]/5 rounded-sm">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black font-cactus">{scorePercent}%</span>
                <span className="text-[8px] uppercase tracking-widest text-[var(--cordel-text)]/60 font-bold mt-1">
                  {t.perfectLabel}
                </span>
              </div>
            </div>

            {/* Badge Stamp Card */}
            <div className={`flex-1 p-3 border-2 border-dashed flex flex-col gap-1.5 ${badge.color}`}>
              <div className="flex items-center gap-1.5">
                <Award className="w-5 h-5 shrink-0" />
                <span className="font-cactus font-black text-xs uppercase tracking-wide">
                  {lang === 'fr' ? 'Rang de Mestre :' : 'Classificação :'} <br />
                  <span className="text-sm font-black tracking-normal">{badge.title}</span>
                </span>
              </div>
              <p className="text-[10px] italic leading-relaxed text-[var(--cordel-text)]/85">
                {badge.desc}
              </p>
            </div>
          </div>

          {/* Counts statistics breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 border border-green-600/30 bg-green-500/5 text-green-600">
              <span className="block text-lg font-black font-cactus">{perfectCount}</span>
              <span className="text-[8px] uppercase tracking-wider font-bold">{t.perfectLabel}</span>
            </div>
            <div className="p-2 border border-yellow-600/30 bg-yellow-500/5 text-yellow-600">
              <span className="block text-lg font-black font-cactus">{mediumCount}</span>
              <span className="text-[8px] uppercase tracking-wider font-bold">{t.mediumLabel}</span>
            </div>
            <div className="p-2 border border-[var(--cordel-wood)]/30 bg-[var(--cordel-wood)]/5 text-[var(--cordel-wood)]">
              <span className="block text-lg font-black font-cactus">{missCount}</span>
              <span className="text-[8px] uppercase tracking-wider font-bold">{t.missedLabel}</span>
            </div>
          </div>

          {/* Hits timeline visual detail */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--cordel-text)]/60 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {lang === 'fr' ? 'Analyse détaillée des coups :' : 'Análise detalhada dos toques :'}
            </span>
            <div className="max-h-24 overflow-y-auto border border-[var(--cordel-border)]/30 p-2 bg-[var(--cordel-text)]/5 flex flex-col gap-1 font-mono text-[9px]">
              {hitDetails.map((detail, idx) => {
                const targetStep = currentPattern.targetSteps[idx];
                const beatNum = Math.floor(targetStep / 4) + 1;
                const subdiv = (targetStep % 4) + 1;

                if (!detail || detail.hitTime === -1) {
                  return (
                    <div key={idx} className="flex items-center justify-between text-[var(--cordel-wood)] border-b border-[var(--cordel-border)]/10 pb-0.5">
                      <span>• Note {idx + 1} (T{beatNum}.{subdiv})</span>
                      <span className="font-bold uppercase">{lang === 'fr' ? 'RATÉ' : 'PERDIDO'}</span>
                    </div>
                  );
                }

                const delayMs = Math.round(detail.diff * 1000);
                const isLate = delayMs > 0;
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between border-b border-[var(--cordel-border)]/10 pb-0.5 ${
                      detail.rating === 'perfect' 
                        ? 'text-green-600' 
                        : 'text-yellow-600'
                    }`}
                  >
                    <span>• Note {idx + 1} (T{beatNum}.{subdiv})</span>
                    <span className="font-bold">
                      {detail.rating === 'perfect' ? 'PARFAIT' : 'MOYEN'} ({isLate ? '+' : ''}{delayMs}ms)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGameStatus('idle');
                }}
                className="flex-1 py-3 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold text-sm uppercase cordel-border flex items-center justify-center gap-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors active:translate-y-0.5"
              >
                <RotateCcw className="w-4 h-4" /> {t.btnRetry}
              </button>
              
              {scorePercent >= 70 && (
                currentExerciseIndex < exercisesList.length - 1 ? (
                  <button
                    onClick={() => {
                      setCurrentExerciseIndex(prev => prev + 1);
                      setGameStatus('idle');
                    }}
                    className="flex-1 py-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus font-bold text-sm uppercase cordel-border flex items-center justify-center gap-2 hover:opacity-95 active:translate-y-0.5 transition-colors shadow-md"
                  >
                    {t.btnNext} <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onSuccess?.();
                    }}
                    className="flex-1 py-3 bg-green-600 text-white font-cactus font-bold text-sm uppercase cordel-border flex items-center justify-center gap-2 hover:opacity-95 active:translate-y-0.5 transition-colors shadow-md"
                  >
                    <Check className="w-4 h-4" /> {lang === 'fr' ? 'Terminer' : 'Terminar'}
                  </button>
                )
              )}
            </div>
            <button
              onClick={onExit}
              className="w-full py-2.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-cactus text-xs font-bold uppercase hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {t.exitBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
