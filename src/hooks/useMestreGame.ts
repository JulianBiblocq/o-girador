import React, { useState, useEffect, useRef } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';
import { mestreRounds } from '../data/mestreData';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface UseMestreGameProps {
  lang: 'fr' | 'pt';
  onSuccess?: () => void;
  setRhythmState: (state: 'base' | 'variation' | 'rufo') => void;
  circleRef: React.RefObject<SVGCircleElement | null>;
}

export function useMestreGame({
  lang,
  onSuccess,
  setRhythmState,
  circleRef
}: UseMestreGameProps) {
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isRoundStarted, setIsRoundStarted] = useState<boolean>(false);

  const selectedOptionRef = useRef<string | null>(null);
  const correctAnswerRef = useRef<string>('');
  const scheduledEventIdRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const timerStartTimeRef = useRef<number>(0);
  const timerDurationRef = useRef<number>(0);
  const playbackActiveRef = useRef<boolean>(false);

  const activeRound = mestreRounds[roundIdx];

  useEffect(() => {
    if (validationResult === 'success') {
      onSuccess?.();
    }
  }, [validationResult, onSuccess]);

  useEffect(() => {
    if (activeRound) {
      correctAnswerRef.current = activeRound.correctAnswer[lang];
    }
  }, [activeRound, lang]);

  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  useEffect(() => {
    return () => {
      cleanUpTimer();
    };
  }, []);

  const cleanUpTimer = () => {
    playbackActiveRef.current = false;
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (scheduledEventIdRef.current !== null) {
      try {
        safeGetTone()?.Transport.clear(scheduledEventIdRef.current);
      } catch (e) {}
      scheduledEventIdRef.current = null;
    }
  };

  const startRound = async () => {
    cleanUpTimer();
    setSelectedOption(null);
    setValidationResult(null);
    setRhythmState('base');
    setIsRoundStarted(true);
    setIsTimerRunning(true);
    
    await loadTone();
    const tone = getTone();

    if (tone.Transport.state !== 'started') {
      tone.Transport.start();
    }

    const duration = tone.Time("2m").toSeconds();
    timerDurationRef.current = duration;
    timerStartTimeRef.current = tone.Transport.seconds;
    playbackActiveRef.current = true;

    const eventId = tone.Transport.schedule((time) => {
      const answer = selectedOptionRef.current;
      const correct = correctAnswerRef.current;
      
      tone.Draw.schedule(() => {
        if (answer === correct) {
          setValidationResult('success');
          setRhythmState('variation');
        } else {
          setValidationResult('failure');
          setRhythmState('rufo');
        }
        setIsTimerRunning(false);
      }, time);

    }, `+2m`);
    
    scheduledEventIdRef.current = eventId;

    const updateProgress = () => {
      if (!playbackActiveRef.current) return;
      
      const elapsed = tone.Transport.seconds - timerStartTimeRef.current;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = String(201 * progress);
      }

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(updateProgress);
      } else {
        if (circleRef.current) {
          circleRef.current.style.strokeDashoffset = '201';
        }
      }
    };
    
    animationFrameIdRef.current = requestAnimationFrame(updateProgress);
  };

  const handleOptionSelect = (option: string) => {
    if (validationResult !== null || !isTimerRunning) return;
    setSelectedOption(option);
  };

  const handleNextRound = () => {
    cleanUpTimer();
    setIsRoundStarted(false);
    setSelectedOption(null);
    setValidationResult(null);
    setRhythmState('base');
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = '0';
    }
    
    if (roundIdx < mestreRounds.length - 1) {
      setRoundIdx(roundIdx + 1);
    } else {
      setRoundIdx(0);
    }
  };

  return {
    roundIdx,
    selectedOption,
    validationResult,
    isTimerRunning,
    isRoundStarted,
    activeRound,
    startRound,
    handleOptionSelect,
    handleNextRound,
  };
}
