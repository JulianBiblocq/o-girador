import { useState, useEffect, useRef, useCallback } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';
import { audioEngine } from '../hooks/useAudioSync';
import { useAuth } from '../contexts/AuthContext';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

const getInstrumentNameFromIdx = (idx: number) => {
  if (idx === 0) return 'alfaia';
  if (idx === 3) return 'caixa';
  if (idx === 5) return 'gongue';
  if (idx === 6) return 'agbe';
  return 'caixa';
};

interface UseSablierGameProps {
  lang: 'fr' | 'pt';
  onSuccess?: () => void;
  exerciseData?: any;
}

export function useSablierGame({ lang, onSuccess, exerciseData }: UseSablierGameProps) {
  const { userProfile } = useAuth();
  
  const targetInstrument = userProfile?.instrument || 'caixa';
  
  const seqFond = exerciseData?.sequence_fond || [];
  const seqCible = exerciseData?.sequence_cible || [];
  const seqPiege1 = exerciseData?.sequence_piege_1 || [];
  const seqPiege2 = exerciseData?.sequence_piege_2 || [];
  const seqPiege3 = exerciseData?.sequence_piege_3 || [];
  
  const bpm = exerciseData?.bpm || 83;
  const measures = exerciseData?.nombre_de_mesures || 2;
  const signImage = exerciseData?.image_main || '';
  
  const [gameState, setGameState] = useState<'idle' | 'playing_base' | 'sablier_active' | 'success' | 'failure'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [options, setOptions] = useState<{ id: number, type: 'cible' | 'piege1' | 'piege2' | 'piege3', track: any }[]>([]);
  const [isSoloPlaying, setIsSoloPlaying] = useState<number | null>(null);

  const sablierTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const tCible = seqCible.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    const tP1 = seqPiege1.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    const tP2 = seqPiege2.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    const tP3 = seqPiege3.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === targetInstrument);
    
    const pool = [
      { id: 0, type: 'cible' as const, track: tCible },
      { id: 1, type: 'piege1' as const, track: tP1 },
      { id: 2, type: 'piege2' as const, track: tP2 },
      { id: 3, type: 'piege3' as const, track: tP3 },
    ].filter(o => o.track);

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setOptions(pool);
  }, [seqCible, seqPiege1, seqPiege2, seqPiege3, targetInstrument]);

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

  const playBaseLoop = async () => {
    await loadTone();
    const tone = getTone();

    tone.Transport.cancel();
    tone.Transport.stop();
    
    scheduleSequence(seqFond, "0:0:0", true, "0:0:0", `${measures}:0:0`);
    
    if (tone.context.state !== 'running') {
      tone.context.resume();
    }
    
    tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    setGameState('playing_base');

    const durationMs = (measures * 4 * 60 * 1000) / bpm;
    setTimeout(() => {
      if (tone.Transport.state === 'started') {
        startSablier();
      }
    }, durationMs);
  };

  const startSablier = () => {
    setGameState('sablier_active');
    let timeLeftLocal = 2;
    setTimeLeft(timeLeftLocal);

    const measureDurationMs = (4 * 60 * 1000) / bpm;
    
    sablierTimerRef.current = setInterval(() => {
      timeLeftLocal -= 1;
      setTimeLeft(timeLeftLocal);
      
      if (timeLeftLocal <= 0) {
        clearInterval(sablierTimerRef.current as NodeJS.Timeout);
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
      setGameState('success');
      playTargetSequence();
    } else {
      handleFailure();
    }
  };

  const playTargetSequence = async () => {
    await loadTone();
    const tone = getTone();

    tone.Transport.cancel();
    tone.Transport.stop();
    
    scheduleSequence(seqCible, "0:0:0", false, "0:0:0", "0:0:0");
    tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    
    const durationMs = (measures * 4 * 60 * 1000) / bpm;
    setTimeout(() => {
      tone.Transport.stop();
      onSuccess?.();
    }, durationMs + 500);
  };

  const handleFailure = async () => {
    setGameState('failure');
    await loadTone();
    const tone = getTone();

    tone.Transport.cancel();
    tone.Transport.stop();

    try {
      const res = await fetch('/presets/fatras.json');
      const fatras = await res.json();
      
      scheduleSequence(fatras.tracks, "0:0:0", false, "0:0:0", "0:0:0");
      tone.Transport.bpm.value = fatras.bpm || 150;
      tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
      
      const meas = fatras.totalMeasures || 1;
      const durMs = (meas * 4 * 60 * 1000) / fatras.bpm;
      setTimeout(() => {
        tone.Transport.stop();
        setGameState('idle');
      }, durMs + 500);
    } catch (e) {
      console.error(e);
      setGameState('idle');
    }
  };

  const playSoloOption = async (option: any) => {
    await loadTone();
    const tone = getTone();

    if (isSoloPlaying === option.id) {
      tone.Transport.stop();
      tone.Transport.cancel();
      setIsSoloPlaying(null);
      return;
    }

    tone.Transport.stop();
    tone.Transport.cancel();
    
    if (gameState === 'playing_base' || gameState === 'sablier_active') {
       alert(lang === 'fr' ? "Impossible pendant le jeu !" : "Não é possível durante o jogo!");
       return;
    }

    scheduleSequence([option.track], "0:0:0", false, "0:0:0", "0:0:0");
    tone.Transport.bpm.value = bpm;
    tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    setIsSoloPlaying(option.id);

    const durationMs = (measures * 4 * 60 * 1000) / bpm;
    setTimeout(() => {
      tone.Transport.stop();
      setIsSoloPlaying(null);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (sablierTimerRef.current) clearInterval(sablierTimerRef.current);
      const tone = safeGetTone();
      if (tone) {
        tone.Transport.stop();
        tone.Transport.cancel();
      }
    };
  }, []);

  return {
    gameState,
    timeLeft,
    options,
    isSoloPlaying,
    targetInstrument,
    signImage,
    playBaseLoop,
    handleValidation,
    playSoloOption,
  };
}
