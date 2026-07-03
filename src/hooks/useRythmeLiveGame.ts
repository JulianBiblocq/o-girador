import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';
import { rhythmLivePattern } from '../data/rythmeLiveData';
import { TrackGroup } from '../types';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface HitDetail {
  hitTime: number;
  diff: number;
  rating: 'perfect' | 'medium' | 'miss';
}

interface UseRythmeLiveGameProps {
  lang: 'fr' | 'pt';
  onSuccess?: () => void;
  exerciseData?: any;
  playheadRef: React.RefObject<HTMLDivElement | null>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  feedbackOverlayRef: React.RefObject<HTMLDivElement | null>;
  tapZoneRef: React.RefObject<HTMLDivElement | null>;
}

export function useRythmeLiveGame({
  lang,
  onSuccess,
  exerciseData,
  playheadRef,
  timelineRef,
  feedbackOverlayRef,
  tapZoneRef
}: UseRythmeLiveGameProps) {
  const exercisesList = useMemo(() => {
    if (!exerciseData) return [rhythmLivePattern];
    if (exerciseData.exercises && Array.isArray(exerciseData.exercises)) {
      return exerciseData.exercises.map((ex: any) => {
        let targetSteps: number[] = [];
        if (ex.partition_cible && ex.partition_cible.length > 0) {
           ex.partition_cible.forEach((t: any) => {
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

  const [gameStatus, setGameStatus] = useState<'idle' | 'countdown' | 'playing' | 'finished'>('idle');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  
  // hitDetails n'est mis à jour réactivement qu'à la fin de la partie pour l'affichage final
  const [hitDetails, setHitDetails] = useState<(HitDetail | null)[]>([]);

  const gameStatusRef = useRef(gameStatus);
  const playStartTimeRef = useRef<number>(0);
  const hitDetailsRef = useRef<(HitDetail | null)[]>([]);
  const scheduledEventIdsRef = useRef<number[]>([]);
  const clickSynthRef = useRef<ToneType.Synth | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);
  const timelineWidthRef = useRef<number>(0);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  // Initialiser hitDetailsRef et hitDetails state pour le nouveau pattern
  useEffect(() => {
    const emptyDetails = new Array(currentPattern.targetSteps.length).fill(null);
    hitDetailsRef.current = emptyDetails;
    setHitDetails(emptyDetails);
  }, [currentPattern]);

  // ResizeObserver pour mesurer la largeur de la timeline sans forcer de Layout Thrashing (Reflow)
  useEffect(() => {
    if (!timelineRef.current) return;

    timelineWidthRef.current = timelineRef.current.clientWidth;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        timelineWidthRef.current = entry.contentRect.width;
      }
    });

    observer.observe(timelineRef.current);
    return () => {
      observer.disconnect();
    };
  }, [timelineRef]);

  const cleanUpAudio = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    scheduledEventIdsRef.current.forEach((id) => {
      try {
        safeGetTone()?.Transport.clear(id);
      } catch (_) {}
    });
    scheduledEventIdsRef.current = [];

    if (clickSynthRef.current) {
      try {
        clickSynthRef.current.dispose();
      } catch (_) {}
      clickSynthRef.current = null;
    }

    try {
      safeGetTone()?.Transport.stop();
    } catch (_) {}

    // Règle 4 : Annuler les événements Draw de Tone.js en cours au démontage
    try {
      safeGetTone()?.Draw.cancel();
    } catch (_) {}
  }, []);

  useEffect(() => {
    return () => {
      cleanUpAudio();
    };
  }, [cleanUpAudio]);

  const resetTimelineVisuals = useCallback(() => {
    if (timelineRef.current) {
      const notes = timelineRef.current.querySelectorAll('[data-note-idx]');
      notes.forEach((note, idx) => {
        note.className = "absolute w-6 h-6 -ml-3 rounded-full border-2 flex items-center justify-center font-mono text-[9px] font-black z-10 shadow-sm transition-all duration-100 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]";
        note.textContent = String(idx + 1);
      });
    }
    if (feedbackOverlayRef.current) {
      feedbackOverlayRef.current.style.opacity = '0';
    }
  }, [timelineRef, feedbackOverlayRef]);

  const showVisualFeedback = useCallback((rating: 'perfect' | 'medium' | 'miss', message: string) => {
    const overlay = feedbackOverlayRef.current;
    const tapZone = tapZoneRef.current;

    if (overlay) {
      overlay.textContent = message;
      overlay.style.opacity = '1';
      overlay.className = "absolute z-30 font-cactus font-black text-lg px-4 py-2 border-3 border-dashed uppercase rotate-[-8deg] pointer-events-none bg-[var(--cordel-bg)]/95 shadow-md";
      
      if (rating === 'perfect') {
        overlay.classList.add('text-green-600', 'border-green-600');
      } else if (rating === 'medium') {
        overlay.classList.add('text-yellow-600', 'border-yellow-600');
      } else {
        overlay.classList.add('text-[var(--cordel-wood)]', 'border-[var(--cordel-wood)]');
      }

      overlay.animate([
        { transform: 'scale(0.8) rotate(-8deg)', opacity: 0 },
        { transform: 'scale(1.1) rotate(-8deg)', opacity: 1 },
        { transform: 'scale(1) rotate(-8deg)', opacity: 1 }
      ], {
        duration: 150,
        easing: 'ease-out',
        fill: 'both'
      });
    }

    if (tapZone) {
      const flashBg = rating === 'perfect' 
        ? 'rgba(22, 163, 74, 0.2)' 
        : (rating === 'medium' ? 'rgba(202, 138, 4, 0.2)' : 'rgba(185, 28, 28, 0.2)');
      tapZone.animate([
        { backgroundColor: flashBg },
        { backgroundColor: 'transparent' }
      ], {
        duration: 200,
        easing: 'ease-out',
        fill: 'both'
      });
    }
  }, [feedbackOverlayRef, tapZoneRef]);

  const startGame = async () => {
    cleanUpAudio();
    setGameStatus('countdown');
    setCountdownValue(4);
    if (playheadRef.current) {
      playheadRef.current.style.transform = 'translate3d(0px, 0, 0)';
    }

    resetTimelineVisuals();

    const emptyDetails = new Array(currentPattern.targetSteps.length).fill(null);
    hitDetailsRef.current = emptyDetails;
    setHitDetails(emptyDetails);
    
    lastHitTimeRef.current = 0;

    await loadTone();
    const tone = getTone();

    if (tone.context.state !== 'running') {
      await tone.start();
    }

    clickSynthRef.current = new tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -6
    }).toDestination();

    tone.Transport.bpm.value = currentPattern.bpm;
    
    if (tone.Transport.state !== 'started') {
      tone.Transport.start();
    }

    const t0 = tone.Transport.seconds + 0.1;
    const beatDuration = 60 / currentPattern.bpm;

    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatDuration;
      const eventId = tone.Transport.schedule((time) => {
        if (clickSynthRef.current) {
          clickSynthRef.current.triggerAttackRelease(i === 3 ? "A5" : "E5", "16n", time);
        }
        tone.Draw.schedule(() => {
          setCountdownValue(4 - i);
        }, time);
      }, clickTime);
      scheduledEventIdsRef.current.push(eventId);
    }

    const playStartTime = t0 + 4 * beatDuration;
    playStartTimeRef.current = playStartTime;

    const playStartEventId = tone.Transport.schedule((time) => {
      if (clickSynthRef.current) {
        clickSynthRef.current.triggerAttackRelease("E6", "16n", time);
      }
      tone.Draw.schedule(() => {
        setCountdownValue(null);
        setGameStatus('playing');
      }, time);
    }, playStartTime);
    scheduledEventIdsRef.current.push(playStartEventId);

    const totalDuration = currentPattern.totalMeasures * 4 * beatDuration;
    const playEndTime = playStartTime + totalDuration;

    const updatePlayhead = () => {
      if (gameStatusRef.current !== 'playing') return;
      
      const elapsed = safeGetTone()!.Transport.seconds - playStartTimeRef.current;
      const currentProgress = Math.min(1, Math.max(0, elapsed / totalDuration));
      
      if (playheadRef.current) {
        // Zéro Layout Thrashing : lecture dans timelineWidthRef.current (mise à jour par ResizeObserver)
        const width = timelineWidthRef.current;
        playheadRef.current.style.transform = `translate3d(${currentProgress * width}px, 0, 0)`;
      }

      if (currentProgress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(updatePlayhead);
      }
    };

    const animationTriggerEventId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        animationFrameIdRef.current = requestAnimationFrame(updatePlayhead);
      }, time);
    }, playStartTime - 0.05);
    scheduledEventIdsRef.current.push(animationTriggerEventId);

    const playEndEventId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        const currentDetails = [...hitDetailsRef.current];
        const finalDetails = currentDetails.map((detail) => {
          if (detail === null) {
            return { hitTime: -1, diff: -1, rating: 'miss' as const };
          }
          return detail;
        });
        hitDetailsRef.current = finalDetails;
        setHitDetails(finalDetails); // Un seul render React final à la fin du jeu
        setGameStatus('finished');
        cleanUpAudio();
      }, time);
    }, playEndTime);
    scheduledEventIdsRef.current.push(playEndEventId);
  };

  const handleUserHit = (e?: React.SyntheticEvent | KeyboardEvent | MouseEvent | TouchEvent) => {
    const tone = safeGetTone();
    if (!tone || gameStatusRef.current !== 'playing') return;

    // Précision Temporelle Déterministe
    let elapsed = tone.Transport.seconds - playStartTimeRef.current;
    if (e) {
      const nativeEvent = (e as any).nativeEvent || e;
      if (nativeEvent && nativeEvent.timeStamp) {
        const delayMs = performance.now() - nativeEvent.timeStamp;
        const eventTransportSeconds = tone.Transport.seconds - (delayMs / 1000);
        elapsed = eventTransportSeconds - playStartTimeRef.current;
      }
    }

    // Prévenir les doubles déclenchements dans les 50ms
    if (elapsed - lastHitTimeRef.current < 0.050) return;
    lastHitTimeRef.current = elapsed;

    const beatDuration = 60 / currentPattern.bpm;
    const stepDuration = beatDuration / (currentPattern.stepsPerMeasure / 4);
    const targets = currentPattern.targetSteps.map((step: number) => step * stepDuration);

    let closestIdx = -1;
    let minDiff = Infinity;

    for (let i = 0; i < targets.length; i++) {
      if (hitDetailsRef.current[i] !== null) continue;
      const diff = Math.abs(targets[i] - elapsed);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    const matchWindow = 0.150;
    if (closestIdx !== -1 && minDiff <= matchWindow) {
      const diff = elapsed - targets[closestIdx];
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

      hitDetailsRef.current[closestIdx] = { hitTime: elapsed, diff, rating };

      // Mise à jour visuelle directe des ronds dans la timeline (Zéro Render Thrashing)
      if (timelineRef.current) {
        const noteEl = timelineRef.current.querySelector(`[data-note-idx="${closestIdx}"]`);
        if (noteEl) {
          noteEl.classList.remove('bg-[var(--cordel-bg)]', 'text-[var(--cordel-text)]', 'border-[var(--cordel-border)]');
          if (rating === 'perfect') {
            noteEl.classList.add('bg-green-600', 'text-white', 'border-green-800');
            noteEl.textContent = '★';
          } else if (rating === 'medium') {
            noteEl.classList.add('bg-yellow-500', 'text-black', 'border-yellow-700');
            noteEl.textContent = '✓';
          } else {
            noteEl.classList.add('bg-[var(--cordel-wood)]', 'text-white', 'border-black');
            noteEl.textContent = '✗';
          }
        }
      }

      const feedbackMsg = `${message} (${diff > 0 ? '+' : ''}${Math.round(diff * 1000)}ms)`;
      showVisualFeedback(rating, feedbackMsg);
    } else {
      const feedbackMsg = lang === 'fr' ? 'BATTERIE HORS CADRE !' : 'FORA DE COMPASSO !';
      showVisualFeedback('miss', feedbackMsg);
    }
  };

  const getScoreSummary = () => {
    let perfects = 0;
    let mediums = 0;
    let misses = 0;
    let rawScore = 0;

    hitDetails.forEach((detail) => {
      if (!detail) {
        misses++;
        return;
      }
      if (detail.rating === 'perfect') {
        perfects++;
        rawScore += 100;
      } else if (detail.rating === 'medium') {
        mediums++;
        rawScore += 50;
      } else {
        misses++;
      }
    });

    const maxPossibleScore = hitDetails.length * 100;
    const finalScore = maxPossibleScore > 0 ? Math.round((rawScore / maxPossibleScore) * 100) : 0;
    const isPassing = finalScore >= 70;

    return { perfects, mediums, misses, finalScore, isPassing };
  };

  useEffect(() => {
    if (gameStatus === 'finished') {
      const { isPassing } = getScoreSummary();
      if (isPassing) {
        onSuccess?.();
      }
    }
  }, [gameStatus]);

  const restartGame = () => {
    setGameStatus('idle');
    setCountdownValue(null);
    
    resetTimelineVisuals();

    const emptyDetails = new Array(currentPattern.targetSteps.length).fill(null);
    hitDetailsRef.current = emptyDetails;
    setHitDetails(emptyDetails);
    
    if (playheadRef.current) {
      playheadRef.current.style.transform = 'translate3d(0px, 0, 0)';
    }
  };

  return {
    currentExerciseIndex,
    setCurrentExerciseIndex,
    currentPattern,
    exercisesList,
    gameStatus,
    countdownValue,
    hitDetails,
    startGame,
    handleUserHit,
    getScoreSummary,
    restartGame,
  };
}
