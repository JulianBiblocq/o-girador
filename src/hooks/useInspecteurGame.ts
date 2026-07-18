import { useState, useEffect, useMemo, useRef } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';
import { audioEngine } from '../hooks/useAudioSync';

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

interface UseInspecteurGameProps {
  onSuccess?: () => void;
  exerciseData?: any;
}

export function useInspecteurGame({ onSuccess, exerciseData }: UseInspecteurGameProps) {
  const effectiveExerciseData = useMemo(() => {
    if (exerciseData && exerciseData.partition_parfaite && exerciseData.partition_parfaite.length > 0) {
      return exerciseData;
    }
    return {
      id: 'default_inspecteur_ex',
      module: 'inspecteur',
      folheto_titre: "L'Inspecteur",
      bpm: 83,
      loop_start: 0,
      loop_end: 0,
      instrument_coupable: 'caixa',
      partition_parfaite: [
        {
          instrumentIdx: 3,
          patterns: [{ activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] }]
        }
      ],
      piste_sabotee: [
        {
          instrumentIdx: 3,
          patterns: [{ activeSteps: [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] }]
        }
      ]
    };
  }, [exerciseData]);

  const perfectAudio = effectiveExerciseData?.partition_parfaite || [];
  const sabotagedAudio = effectiveExerciseData?.piste_sabotee || [];
  const guiltyInstStr = effectiveExerciseData?.instrument_coupable || 'caixa';
  const loopStart = effectiveExerciseData?.loop_start || 0;
  const loopEnd = effectiveExerciseData?.loop_end || 0;
  const bpm = effectiveExerciseData?.bpm || 83;
  const totalMeasures = perfectAudio.length > 0 ? Math.max(...perfectAudio.map((t: any) => t.patterns?.length || 1)) : 1;

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [selectedMeasures, setSelectedMeasures] = useState<number[]>([]);
  const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const actualGuiltyMeasures = useMemo(() => {
    const guiltyMeasures: number[] = [];
    const perfTrack = perfectAudio.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === guiltyInstStr);
    const sabTrack = sabotagedAudio.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === guiltyInstStr);
    if (!perfTrack || !sabTrack) return [];
    
    for (let m = loopStart; m <= loopEnd; m++) {
      let isDifferent = false;
      for (let i = 0; i < 16; i++) {
        const p = perfTrack.patterns[m]?.activeSteps?.[i];
        const s = sabTrack.patterns[m]?.activeSteps?.[i];
        const pNorm = (p === 0 || p === "0") ? null : p;
        const sNorm = (s === 0 || s === "0") ? null : s;
        if (pNorm !== sNorm) {
          isDifferent = true;
          break;
        }
      }
      if (isDifferent) guiltyMeasures.push(m);
    }
    return guiltyMeasures;
  }, [perfectAudio, sabotagedAudio, guiltyInstStr, loopStart, loopEnd]);

  const scheduleTracks = (tracks: any[]) => {
    tracks.forEach(track => {
      if (track.isMute) return;
      const patterns = track.patterns || [];
      const instName = getInstrumentNameFromIdx(track.instrumentIdx);
      
      patterns.forEach((pattern: any, m: number) => {
        const steps = pattern.activeSteps || [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          if (step !== 0 && step !== '0' && step !== null) {
            const beat = Math.floor(i / 4);
            const sixteenth = i % 4;
            const timeStr = `${m}:${beat}:${sixteenth}`;
            
            safeGetTone()?.Transport.schedule((time) => {
              audioEngine.playNote(instName, step, time, 1.0, 1.0);
            }, timeStr);
          }
        }
      });
    });
  };

  const playInvestigation = async () => {
    await loadTone();
    const tone = getTone();

    tone.Transport.cancel();
    tone.Transport.stop();
    
    const mixedTracks = perfectAudio.map((track: any) => {
      if (getInstrumentNameFromIdx(track.instrumentIdx) === guiltyInstStr) {
        const sabTrack = sabotagedAudio.find((t: any) => getInstrumentNameFromIdx(t.instrumentIdx) === guiltyInstStr);
        return sabTrack || track;
      }
      return track;
    });
    
    scheduleTracks(mixedTracks);
    
    tone.Transport.bpm.value = bpm;
    tone.Transport.setLoopPoints(`${loopStart}:0:0`, `${loopEnd + 1}:0:0`);
    tone.Transport.loop = true;
    
    if (tone.context.state !== 'running') {
      tone.context.resume();
    }
    
    tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, `${loopStart}:0:0`);
    setIsPlaying(true);
  };

  const playResolution = async () => {
    await loadTone();
    const tone = getTone();

    tone.Transport.cancel();
    tone.Transport.stop();
    
    scheduleTracks(perfectAudio);
    
    tone.Transport.bpm.value = bpm;
    tone.Transport.loop = false;
    
    if (tone.context.state !== 'running') {
      tone.context.resume();
    }
    
    tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
    setIsPlaying(true);
    setIsResolving(true);
    
    const durationSec = (totalMeasures * 4 * 60) / bpm;
    setTimeout(() => {
      safeGetTone()?.Transport.stop();
      setIsPlaying(false);
      onSuccess?.();
    }, durationSec * 1000 + 500);
  };

  const playFatras = async () => {
    await loadTone();
    const tone = getTone();

    tone.Transport.cancel();
    tone.Transport.stop();
    
    try {
      const res = await fetch('/presets/fatras.json');
      const fatras = await res.json();
      
      scheduleTracks(fatras.tracks);
      
      tone.Transport.bpm.value = fatras.bpm || 150;
      tone.Transport.loop = false;
      
      if (tone.context.state !== 'running') {
        tone.context.resume();
      }
      
      tone.Transport.start(`+${audioEngine?.['SCHEDULE_AHEAD_TIME'] || 0.1}`, "0:0:0");
      setIsPlaying(true);
      
      const measures = fatras.totalMeasures || 1;
      const durationSec = (measures * 4 * 60) / tone.Transport.bpm.value;
      setTimeout(() => {
        safeGetTone()?.Transport.stop();
        setIsPlaying(false);
      }, durationSec * 1000 + 500);
    } catch (err) {
      console.error("Fatras error:", err);
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      safeGetTone()?.Transport.pause();
      setIsPlaying(false);
    } else {
      playInvestigation();
    }
  };

  const stopPlayback = () => {
    safeGetTone()?.Transport.stop();
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      const tone = safeGetTone();
      if (tone) {
        tone.Transport.stop();
        tone.Transport.cancel();
      }
      setIsPlaying(false);
    };
  }, []);

  const handleValidate = () => {
    if (validationResult === 'success') return;

    const isInstCorrect = selectedSuspect === guiltyInstStr;
    const isMeasuresCorrect = 
      selectedMeasures.length === actualGuiltyMeasures.length &&
      selectedMeasures.every(m => actualGuiltyMeasures.includes(m));

    if (isInstCorrect && isMeasuresCorrect) {
       setValidationResult('success');
       playResolution();
    } else {
       setValidationResult('failure');
       playFatras();
    }
  };

  const toggleMeasure = (m: number) => {
    if (selectedMeasures.includes(m)) {
      setSelectedMeasures(selectedMeasures.filter(x => x !== m));
    } else {
      setSelectedMeasures([...selectedMeasures, m]);
    }
  };

  return {
    isPlaying,
    selectedSuspect,
    selectedMeasures,
    validationResult,
    isResolving,
    totalMeasures,
    loopStart,
    loopEnd,
    guiltyInstStr,
    actualGuiltyMeasures,
    setSelectedSuspect,
    setValidationResult,
    togglePlayback,
    stopPlayback,
    handleValidate,
    toggleMeasure,
  };
}
