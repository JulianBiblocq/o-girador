import { useState, useEffect, useRef, useMemo } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '../ToneLoader';
import { audioEngine } from '../hooks/useAudioSync';
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { TrackGroup } from '../types';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface Block {
  id: string;
  label: string;
  strokes: string[];
  originalIndex: number;
}

interface UseDicteeGameProps {
  onSuccess?: () => void;
  exerciseData?: any;
}

export function useDicteeGame({ onSuccess, exerciseData }: UseDicteeGameProps) {
  const [placedBlocks, setPlacedBlocks] = useState<(Block | null)[]>([]);
  const [reserveBlocks, setReserveBlocks] = useState<Block[]>([]);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);
  const [blockValidations, setBlockValidations] = useState<('idle' | 'success' | 'failure')[]>([]);
  const [isAnimatingValidation, setIsAnimatingValidation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  const scheduledEventIdsRef = useRef<number[]>([]);
  const clickSynthRef = useRef<ToneType.Synth | null>(null);

  const isMountedRef = useRef(true);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeSlotIdxRef = useRef<number | null>(null);
  const placedBlocksRef = useRef<(Block | null)[]>([]);
  const targetAudioConfigRef = useRef<any>(null);
  const blocksCountRef = useRef<number>(4);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanUpAudio();
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const targetTrackId = exerciseData?.instrument_cible || '';
  const blocksCount = exerciseData?.nombre_de_blocs || 4;
  const bpm = exerciseData?.bpm || 83;
  const sequenceAudio: TrackGroup[] = exerciseData?.sequence_audio || [];

  const targetTrack = useMemo(() => {
    return sequenceAudio.find(t => t.id === targetTrackId);
  }, [sequenceAudio, targetTrackId]);

  const targetInstIdx = targetTrack?.instrumentIdx ?? -1;
  const targetInstrument = targetInstIdx !== -1 ? instrumentsConfig[targetInstIdx] : null;
  const targetAudioConfig = targetInstrument ? instrumentAudioConfigs.find(c => c.id === targetInstrument.id) : null;

  useEffect(() => {
    activeSlotIdxRef.current = activeSlotIdx;
  }, [activeSlotIdx]);

  useEffect(() => {
    placedBlocksRef.current = placedBlocks;
  }, [placedBlocks]);

  useEffect(() => {
    targetAudioConfigRef.current = targetAudioConfig;
  }, [targetAudioConfig]);

  useEffect(() => {
    blocksCountRef.current = blocksCount;
  }, [blocksCount]);

  useEffect(() => {
    if (!targetTrack) return;
    
    const steps: string[] = new Array(16).fill('0');
    if (targetTrack.patterns && targetTrack.patterns[0] && targetTrack.patterns[0].activeSteps) {
      const activeSteps = targetTrack.patterns[0].activeSteps;
      for (let i = 0; i < 16; i++) {
        if (activeSteps[i]) {
          steps[i] = String(activeSteps[i]);
        }
      }
    }

    const newBlocks: Block[] = [];
    if (blocksCount === 16) {
      setPlacedBlocks(new Array(16).fill(null));
      setReserveBlocks([]);
      return;
    }

    const stepPerBlock = 16 / blocksCount;
    for (let i = 0; i < blocksCount; i++) {
      const blockStrokes = steps.slice(i * stepPerBlock, (i + 1) * stepPerBlock);
      const label = blockStrokes.map(s => s === '0' ? '-' : s).join(' ');
      newBlocks.push({
        id: `block_${i}_${Math.random().toString(36).substring(2, 9)}`,
        label,
        strokes: blockStrokes,
        originalIndex: i
      });
    }

    const shuffled = [...newBlocks].sort(() => Math.random() - 0.5);
    setReserveBlocks(shuffled);
    setPlacedBlocks(new Array(blocksCount).fill(null));
    setActiveTileId(null);
    setValidationResult(null);
    setBlockValidations([]);
    setIsAnimatingValidation(false);

    return () => {
      cleanUpAudio();
    };
  }, [targetTrack, blocksCount]);

  const cleanUpAudio = () => {
    scheduledEventIdsRef.current.forEach((id) => {
      try { safeGetTone()?.Transport.clear(id); } catch (_) {}
    });
    scheduledEventIdsRef.current = [];

    if (clickSynthRef.current) {
      try { clickSynthRef.current.dispose(); } catch (_) {}
      clickSynthRef.current = null;
    }

    setIsPlaying(false);
  };

  const playSequence = async () => {
    if (isPlaying) {
      cleanUpAudio();
      return;
    }

    setIsPlaying(true);
    setValidationResult(null);
    setBlockValidations([]);

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

    tone.Transport.bpm.value = bpm;
    
    if (tone.Transport.state !== 'started') {
      tone.Transport.start();
    }

    const t0 = tone.Transport.seconds + 0.1;
    const beatDuration = 60 / bpm;
    const stepDuration = beatDuration / 4;

    // 1. Countdown
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatDuration;
      const id = tone.Transport.schedule((time) => {
        if (clickSynthRef.current) {
          clickSynthRef.current.triggerAttackRelease(i === 3 ? "A5" : "E5", "16n", time);
        }
      }, clickTime);
      scheduledEventIdsRef.current.push(id);
    }

    // 2. Play all active instruments
    const playStartTime = t0 + 4 * beatDuration;
    const totalDuration = 16 * stepDuration;

    sequenceAudio.forEach(track => {
      if (track.isMute || track.instrumentIdx === -1) return;
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst) return;

      const activeSteps = track.patterns[0]?.activeSteps || {};
      const volumes = track.patterns[0]?.volumes || {};
      
      for (let i = 0; i < 16; i++) {
        if (activeSteps[i] && activeSteps[i] !== '0') {
          const stroke = String(activeSteps[i]);
          const time = playStartTime + i * stepDuration;
          const vol = volumes[i] ?? 80;
          const volMultiplier = vol / 100;
          
          const id = tone.Transport.schedule((time) => {
            if (audioEngine) {
              audioEngine.playNote(inst.id, stroke, time, volMultiplier, 1.0);
            }
          }, time);
          scheduledEventIdsRef.current.push(id);
        }
      }
    });

    // 3. Stop
    const endId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        setIsPlaying(false);
        cleanUpAudio();
      }, time);
    }, playStartTime + totalDuration + 0.5);
    scheduledEventIdsRef.current.push(endId);
  };

  const handleReserveClick = (block: Block) => {
    if (isPlaying) cleanUpAudio();
    if (activeTileId === block.id) {
      setActiveTileId(null);
    } else {
      setActiveTileId(block.id);
    }
  };

  const handleSlotClick = (slotIdx: number) => {
    if (isPlaying) cleanUpAudio();

    if (blocksCount === 16) {
      setActiveSlotIdx(slotIdx);
      return;
    }

    const existingBlock = placedBlocks[slotIdx];
    if (activeTileId !== null) {
      const activeBlock = reserveBlocks.find((b) => b.id === activeTileId);
      if (!activeBlock) return;

      const nextPlaced = [...placedBlocks];
      if (existingBlock) {
        setReserveBlocks((prev) => [...prev.filter((b) => b.id !== activeTileId), existingBlock]);
      } else {
        setReserveBlocks((prev) => prev.filter((b) => b.id !== activeTileId));
      }

      nextPlaced[slotIdx] = activeBlock;
      setPlacedBlocks(nextPlaced);
      setActiveTileId(null);
      setValidationResult(null);
      setBlockValidations([]);
    } 
    else if (existingBlock) {
      const nextPlaced = [...placedBlocks];
      nextPlaced[slotIdx] = null;
      setPlacedBlocks(nextPlaced);
      setReserveBlocks((prev) => [...prev, existingBlock]);
      setValidationResult(null);
      setBlockValidations([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (blocksCountRef.current !== 16) return;
      if (activeSlotIdxRef.current === null) return;
      if (!targetAudioConfigRef.current) return;

      const key = e.key.toLowerCase();
      const currentIdx = activeSlotIdxRef.current;

      if (key === 'backspace' || key === 'delete') {
        const nextPlaced = [...placedBlocksRef.current];
        nextPlaced[currentIdx] = null;
        setPlacedBlocks(nextPlaced);
        setActiveSlotIdx(prev => prev! > 0 ? prev! - 1 : prev);
        return;
      }

      const targetStroke = targetAudioConfigRef.current.strokes.find((s: any) => 
        s.keys.map((k: string) => k.toLowerCase()).includes(key)
      );

      if (targetStroke) {
        const strokeSymbol = targetStroke.symbol;
        const nextPlaced = [...placedBlocksRef.current];
        nextPlaced[currentIdx] = {
          id: `block_16_${currentIdx}`,
          label: strokeSymbol,
          strokes: [strokeSymbol],
          originalIndex: currentIdx
        };
        setPlacedBlocks(nextPlaced);
        
        if (currentIdx < 15) {
          setActiveSlotIdx(currentIdx + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleValidate = () => {
    if (isAnimatingValidation) return;

    if (blocksCount !== 16) {
      if (placedBlocks.some((b) => b === null)) return;
    }
    
    setIsAnimatingValidation(true);
    setBlockValidations(new Array(blocksCount).fill('idle'));
    let hasError = false;

    const animateBlock = (idx: number) => {
      if (!isMountedRef.current) return;
      if (idx >= blocksCount) {
        setIsAnimatingValidation(false);
        setValidationResult(!hasError ? 'success' : 'failure');
        return;
      }

      setBlockValidations(prev => {
        const next = [...prev];
        let isCorrect = true;
        if (blocksCount !== 16) {
          isCorrect = placedBlocks[idx]?.originalIndex === idx;
        } else {
          const activeSteps = targetTrack?.patterns[0]?.activeSteps || {};
          const target = (activeSteps[idx] && activeSteps[idx] !== '0') ? String(activeSteps[idx]) : null;
          const placed = placedBlocks[idx]?.strokes[0] || null;
          isCorrect = target === placed;
        }
        
        if (!isCorrect) hasError = true;
        next[idx] = isCorrect ? 'success' : 'failure';
        return next;
      });
      
      validationTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          animateBlock(idx + 1);
        }
      }, 300);
    };

    animateBlock(0);
  };

  const isTimelineFull = blocksCount === 16 ? true : placedBlocks.every((b) => b !== null);

  return {
    placedBlocks,
    reserveBlocks,
    activeTileId,
    validationResult,
    blockValidations,
    isPlaying,
    activeSlotIdx,
    targetInstrument,
    targetAudioConfig,
    blocksCount,
    isTimelineFull,
    playSequence,
    handleReserveClick,
    handleSlotClick,
    handleValidate,
    setActiveSlotIdx
  };
}
