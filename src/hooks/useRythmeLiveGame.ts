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
}

export function useRythmeLiveGame({
  lang,
  onSuccess,
  exerciseData,
  playheadRef,
  timelineRef
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
  const [hitDetails, setHitDetails] = useState<(HitDetail | null)[]>([]);
  const [flashState, setFlashState] = useState<{
    type: 'perfect' | 'medium' | 'miss';
    message: string;
    key: number;
  } | null>(null);

  const gameStatusRef = useRef(gameStatus);
  const playStartTimeRef = useRef<number>(0);
  const hitDetailsRef = useRef<(HitDetail | null)[]>([]);
  const scheduledEventIdsRef = useRef<number[]>([]);
  const clickSynthRef = useRef<ToneType.Synth | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    hitDetailsRef.current = hitDetails;
  }, [hitDetails]);

  useEffect(() => {
    setHitDetails(new Array(currentPattern.targetSteps.length).fill(null));
  }, [currentPattern]);

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
  }, []);

  useEffect(() => {
    return () => {
      cleanUpAudio();
    };
  }, [cleanUpAudio]);

  const startGame = async () => {
    cleanUpAudio();
    setGameStatus('countdown');
    setCountdownValue(4);
    if (playheadRef.current) {
      playheadRef.current.style.transform = 'translate3d(0px, 0, 0)';
    }
    setHitDetails(new Array(currentPattern.targetSteps.length).fill(null));
    setFlashState(null);
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
      
      if (playheadRef.current && timelineRef.current) {
        const width = timelineRef.current.clientWidth;
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
        setHitDetails(finalDetails);
        setGameStatus('finished');
        cleanUpAudio();
      }, time);
    }, playEndTime);
    scheduledEventIdsRef.current.push(playEndEventId);
  };

  const handleUserHit = () => {
    const tone = safeGetTone();
    if (!tone || gameStatusRef.current !== 'playing') return;

    const elapsed = tone.Transport.seconds - playStartTimeRef.current;
    
    // Prevent double triggering within 50ms
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

      const updatedDetails = [...hitDetailsRef.current];
      updatedDetails[closestIdx] = { hitTime: elapsed, diff, rating };
      setHitDetails(updatedDetails);

      setFlashState({
        type: rating,
        message: `${message} (${diff > 0 ? '+' : ''}${Math.round(diff * 1000)}ms)`,
        key: Math.random()
      });
    } else {
      setFlashState({
        type: 'miss',
        message: lang === 'fr' ? 'BATTERIE HORS CADRE !' : 'FORA DE COMPASSO !',
        key: Math.random()
      });
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
    setHitDetails(new Array(currentPattern.targetSteps.length).fill(null));
    setFlashState(null);
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
    flashState,
    startGame,
    handleUserHit,
    getScoreSummary,
    restartGame,
  };
}
