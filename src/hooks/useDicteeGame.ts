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
  const [isPlayingValidation, setIsPlayingValidation] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  // New states for visual feedback
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [currentPlayMeasure, setCurrentPlayMeasure] = useState<number>(0);

  const scheduledEventIdsRef = useRef<number[]>([]);
  const clickSynthRef = useRef<ToneType.Synth | null>(null);
  const fatrasDataRef = useRef<any>(null);

  const isMountedRef = useRef(true);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeSlotIdxRef = useRef<number | null>(null);
  const placedBlocksRef = useRef<(Block | null)[]>([]);
  const targetAudioConfigRef = useRef<any>(null);
  const blocksCountRef = useRef<number>(4);

  // Load fatras.json at startup
  useEffect(() => {
    isMountedRef.current = true;

    fetch('/presets/fatras.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch fatras');
      })
      .then((data) => {
        if (isMountedRef.current) {
          fatrasDataRef.current = data;
        }
      })
      .catch((err) => {
        console.error('Error loading fatras.json, using fallback:', err);
        if (isMountedRef.current) {
          fatrasDataRef.current = {
            bpm: 150,
            tracks: [
              {
                instrumentIdx: 0,
                patterns: [{ activeSteps: ["0", "D", "0", "D", "E", "0", "D", "0", "D", "0", "E", "0", "E", "0", "E", "D"] }]
              },
              {
                instrumentIdx: 3,
                patterns: [{ activeSteps: ["B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B"] }]
              },
              {
                instrumentIdx: 5,
                patterns: [{ activeSteps: ["B", "0", "B", "0", "B", "0", "B", "0", "B", "0", "B", "0", "B", "0", "B", "0"] }]
              }
            ]
          };
        }
      });

    return () => {
      isMountedRef.current = false;
      cleanUpAudio();
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const effectiveExerciseData = useMemo(() => {
    if (exerciseData && exerciseData.sequence_audio && exerciseData.sequence_audio.length > 0) {
      return exerciseData;
    }
    // Default fallback exercise
    return {
      id: 'default_dictee_ex',
      module: 'dictee',
      folheto_titre: 'Dialogue de Gonguê',
      bpm: 83,
      nombre_de_blocs: 4,
      instrument_cible: 'caixa',
      mesure_debut: 1,
      mesure_fin: 4,
      mesure_source: 4,
      sequence_audio: [
        {
          id: 'caixa',
          instrumentIdx: 3,
          patterns: [
            { activeSteps: [1, 0, 2, 0, 1, 0, 2, 0, 1, 2, 1, 2, 0, 0, 0, 0] },
            { activeSteps: [1, 0, 2, 0, 1, 0, 2, 0, 1, 2, 1, 2, 0, 0, 0, 0] },
            { activeSteps: [1, 0, 2, 0, 1, 0, 2, 0, 1, 2, 1, 2, 0, 0, 0, 0] },
            { activeSteps: [1, 2, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
          ]
        }
      ]
    };
  }, [exerciseData]);

  const targetTrackId = effectiveExerciseData?.instrument_cible || '';
  const blocksCount = effectiveExerciseData?.nombre_de_blocs || 4;
  const bpm = effectiveExerciseData?.bpm || 83;
  const startMeasure = effectiveExerciseData?.mesure_debut || 1;
  const endMeasure = effectiveExerciseData?.mesure_fin || 4;
  const sourceMeasure = effectiveExerciseData?.mesure_source || 4;
  const sequenceAudio: TrackGroup[] = effectiveExerciseData?.sequence_audio || [];

  const targetTrack = useMemo(() => {
    return sequenceAudio.find(t => t.id === targetTrackId || t.instrumentIdx === 3);
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

  // Extract source measure pattern and slice into blocks
  useEffect(() => {
    if (!targetTrack) return;
    
    const steps: string[] = new Array(16).fill('0');
    const sourcePattern = targetTrack.patterns[sourceMeasure - 1] || targetTrack.patterns[0];
    if (sourcePattern && sourcePattern.activeSteps) {
      const activeSteps = sourcePattern.activeSteps;
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
    setCountdownValue(null);
    setCurrentPlayMeasure(startMeasure - 1);

    return () => {
      cleanUpAudio();
    };
  }, [targetTrack, blocksCount, startMeasure, sourceMeasure]);

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
    setIsPlayingValidation(false);
    setCountdownValue(null);
  };

  // Helper to schedule a block of measures (5 to 8)
  const scheduleBlock = (tone: any, startTime: number, isLoopingCorrectPattern: boolean) => {
    const numMeasures = endMeasure - startMeasure + 1;
    const beatDuration = 60 / bpm;
    const stepDuration = beatDuration / 4;
    const measureDuration = 16 * stepDuration;

    for (let m = 0; m < numMeasures; m++) {
      const absMeasureIdx = startMeasure - 1 + m;
      const measureStartTime = startTime + m * measureDuration;

      // 1. Ticks & playhead updates
      for (let step = 0; step < 16; step++) {
        const stepTime = measureStartTime + step * stepDuration;
        const tickId = tone.Transport.schedule((time) => {
          tone.Draw.schedule(() => {
            setCurrentPlayMeasure(absMeasureIdx);
            window.dispatchEvent(new CustomEvent('o-girador-tick', { detail: { step } }));
          }, time);
        }, stepTime);
        scheduledEventIdsRef.current.push(tickId);
      }

      // 2. Play all active instrument tracks
      sequenceAudio.forEach((track) => {
        if (track.isMute || track.instrumentIdx === -1) return;
        const inst = instrumentsConfig[track.instrumentIdx];
        if (!inst) return;

        const pattern = track.patterns[absMeasureIdx];
        if (!pattern) return;

        const activeSteps = pattern.activeSteps || {};
        const volumes = pattern.volumes || {};

        for (let step = 0; step < 16; step++) {
          let stroke = '0';
          let vol = 80;

          const isTargetInst = (track.id === targetTrackId || track.instrumentIdx === targetInstIdx);

          if (isTargetInst) {
            if (isLoopingCorrectPattern) {
              // Play correct original pattern in loop
              stroke = activeSteps[step] ? String(activeSteps[step]) : '0';
              vol = volumes[step] ?? 80;
            } else {
              // Play user's reconstructed pattern on source/dictation measure, original for others
              if (absMeasureIdx === sourceMeasure - 1) {
                const stepPerBlock = 16 / blocksCountRef.current;
                const blockIndex = Math.floor(step / stepPerBlock);
                const stepInBlock = step % stepPerBlock;
                const placedBlock = placedBlocksRef.current[blockIndex];
                stroke = placedBlock?.strokes[stepInBlock] || '0';
              } else {
                stroke = activeSteps[step] ? String(activeSteps[step]) : '0';
                vol = volumes[step] ?? 80;
              }
            }
          } else {
            // Other instruments play normally
            stroke = activeSteps[step] ? String(activeSteps[step]) : '0';
            vol = volumes[step] ?? 80;
          }

          if (stroke && stroke !== '0') {
            const noteTime = measureStartTime + step * stepDuration;
            const volMultiplier = vol / 100;

            const noteId = tone.Transport.schedule((time) => {
              if (audioEngine) {
                audioEngine.playNote(inst.id, stroke, time, volMultiplier, 1.0);
              }
            }, noteTime);
            scheduledEventIdsRef.current.push(noteId);
          }
        }
      });
    }

    // 3. Block end transition
    const blockEndTime = startTime + numMeasures * measureDuration;
    if (isLoopingCorrectPattern) {
      // Loop again (correct pattern)
      const loopId = tone.Transport.schedule((time) => {
        tone.Draw.schedule(() => {
          scheduleBlock(tone, blockEndTime, true);
        }, time);
      }, blockEndTime - 0.05); // slightly ahead to prevent gaps
      scheduledEventIdsRef.current.push(loopId);
    } else {
      // Validation check
      const evaluationId = tone.Transport.schedule((time) => {
        tone.Draw.schedule(() => {
          let isCorrect = true;
          if (blocksCountRef.current !== 16) {
            isCorrect = placedBlocksRef.current.every((b, idx) => b !== null && b.originalIndex === idx);
          } else {
            const activeSteps = targetTrack?.patterns[sourceMeasure - 1]?.activeSteps || {};
            for (let idx = 0; idx < 16; idx++) {
              const target = (activeSteps[idx] && activeSteps[idx] !== '0') ? String(activeSteps[idx]) : null;
              const placed = placedBlocksRef.current[idx]?.strokes[0] || null;
              if (target !== placed) {
                isCorrect = false;
                break;
              }
            }
          }

          if (isCorrect) {
            setValidationResult('success');
            onSuccess?.();
            // Continue looping correct pattern
            scheduleBlock(tone, blockEndTime, true);
          } else {
            // Failure! Play fatras.json!
            playFatras();
          }
        }, time);
      }, blockEndTime);
      scheduledEventIdsRef.current.push(evaluationId);
    }
  };

  // Helper to schedule normal listening block (Caixa muted)
  const scheduleListeningBlock = (tone: any, startTime: number) => {
    const numMeasures = endMeasure - startMeasure + 1;
    const beatDuration = 60 / bpm;
    const stepDuration = beatDuration / 4;
    const measureDuration = 16 * stepDuration;

    for (let m = 0; m < numMeasures; m++) {
      const absMeasureIdx = startMeasure - 1 + m;
      const measureStartTime = startTime + m * measureDuration;

      // 1. Ticks & playhead updates
      for (let step = 0; step < 16; step++) {
        const stepTime = measureStartTime + step * stepDuration;
        const tickId = tone.Transport.schedule((time) => {
          tone.Draw.schedule(() => {
            setCurrentPlayMeasure(absMeasureIdx);
            window.dispatchEvent(new CustomEvent('o-girador-tick', { detail: { step } }));
          }, time);
        }, stepTime);
        scheduledEventIdsRef.current.push(tickId);
      }

      // 2. Play instruments (Caixa muted)
      sequenceAudio.forEach((track) => {
        if (track.isMute || track.instrumentIdx === -1) return;
        const inst = instrumentsConfig[track.instrumentIdx];
        if (!inst) return;

        // Caixa is muted
        const isTargetInst = (track.id === targetTrackId || track.instrumentIdx === targetInstIdx);
        if (isTargetInst) return;

        const pattern = track.patterns[absMeasureIdx];
        if (!pattern) return;

        const activeSteps = pattern.activeSteps || {};
        const volumes = pattern.volumes || {};

        for (let step = 0; step < 16; step++) {
          const stroke = activeSteps[step] ? String(activeSteps[step]) : '0';
          const vol = volumes[step] ?? 80;

          if (stroke && stroke !== '0') {
            const noteTime = measureStartTime + step * stepDuration;
            const volMultiplier = vol / 100;

            const noteId = tone.Transport.schedule((time) => {
              if (audioEngine) {
                audioEngine.playNote(inst.id, stroke, time, volMultiplier, 1.0);
              }
            }, noteTime);
            scheduledEventIdsRef.current.push(noteId);
          }
        }
      });
    }

    // 3. Stop
    const blockEndTime = startTime + numMeasures * measureDuration;
    const stopId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        setIsPlaying(false);
        cleanUpAudio();
      }, time);
    }, blockEndTime + 0.2);
    scheduledEventIdsRef.current.push(stopId);
  };

  // Play fatras preset on failure
  const playFatras = async () => {
    cleanUpAudio();
    setIsPlaying(true);
    setIsPlayingValidation(true);
    setValidationResult('failure');

    const tone = getTone();
    if (tone.context.state !== 'running') {
      await tone.start();
    }

    const fatrasData = fatrasDataRef.current;
    if (!fatrasData) return;

    tone.Transport.bpm.value = fatrasData.bpm || 150;
    tone.Transport.start();

    const t0 = tone.Transport.seconds + 0.05;
    const stepDuration = 60 / (fatrasData.bpm || 150) / 4;

    const tracks = fatrasData.tracks || [];
    tracks.forEach((track: any) => {
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst) return;

      const activeSteps = track.patterns[0]?.activeSteps || [];
      for (let i = 0; i < 16; i++) {
        if (activeSteps[i] && activeSteps[i] !== '0') {
          const stroke = String(activeSteps[i]);
          const time = t0 + i * stepDuration;
          
          const id = tone.Transport.schedule((time) => {
            if (audioEngine) {
              audioEngine.playNote(inst.id, stroke, time, 1.0, 1.0);
            }
          }, time);
          scheduledEventIdsRef.current.push(id);
        }
      }
    });

    // Stop after 1 measure
    const endId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        setIsPlaying(false);
        setIsPlayingValidation(false);
        cleanUpAudio();
      }, time);
    }, t0 + 16 * stepDuration + 0.2);
    scheduledEventIdsRef.current.push(endId);
  };

  const startListening = async () => {
    if (isPlaying) {
      cleanUpAudio();
      return;
    }

    setIsPlaying(true);
    setIsPlayingValidation(false);
    setValidationResult(null);
    setBlockValidations([]);
    setCountdownValue(null);
    setCurrentPlayMeasure(startMeasure - 1);

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

    // Countdown: 1, 2, 3, 4
    setCountdownValue(1);
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatDuration;
      
      const countVisualId = tone.Transport.schedule((time) => {
        tone.Draw.schedule(() => {
          setCountdownValue(i + 1); // Counts up: 1, 2, 3, 4
        }, time);
      }, clickTime);
      scheduledEventIdsRef.current.push(countVisualId);

      const clickId = tone.Transport.schedule((time) => {
        if (clickSynthRef.current) {
          clickSynthRef.current.triggerAttackRelease(i === 3 ? "A5" : "E5", "16n", time);
        }
      }, clickTime);
      scheduledEventIdsRef.current.push(clickId);
    }

    const playStartTime = t0 + 4 * beatDuration;
    
    const hideCountId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        setCountdownValue(null);
      }, time);
    }, playStartTime);
    scheduledEventIdsRef.current.push(hideCountId);

    scheduleListeningBlock(tone, playStartTime);
  };

  const startValidation = async () => {
    if (isAnimatingValidation) return;

    if (blocksCount !== 16) {
      if (placedBlocks.some((b) => b === null)) return;
    }

    if (isPlaying) {
      cleanUpAudio();
    }

    setIsPlaying(true);
    setIsPlayingValidation(true);
    setValidationResult(null);
    setBlockValidations([]);
    setCountdownValue(null);
    setCurrentPlayMeasure(startMeasure - 1);

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

    // Countdown: 1, 2, 3, 4
    setCountdownValue(1);
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatDuration;
      
      const countVisualId = tone.Transport.schedule((time) => {
        tone.Draw.schedule(() => {
          setCountdownValue(i + 1); // Counts up: 1, 2, 3, 4
        }, time);
      }, clickTime);
      scheduledEventIdsRef.current.push(countVisualId);

      const clickId = tone.Transport.schedule((time) => {
        if (clickSynthRef.current) {
          clickSynthRef.current.triggerAttackRelease(i === 3 ? "A5" : "E5", "16n", time);
        }
      }, clickTime);
      scheduledEventIdsRef.current.push(clickId);
    }

    const playStartTime = t0 + 4 * beatDuration;
    
    const hideCountId = tone.Transport.schedule((time) => {
      tone.Draw.schedule(() => {
        setCountdownValue(null);
      }, time);
    }, playStartTime);
    scheduledEventIdsRef.current.push(hideCountId);

    scheduleBlock(tone, playStartTime, false);
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

  // Keyboard shortcut logic for 16-step mode
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

  const isTimelineFull = blocksCount === 16 ? true : placedBlocks.every((b) => b !== null);

  return {
    placedBlocks,
    reserveBlocks,
    activeTileId,
    validationResult,
    blockValidations,
    isPlaying,
    isPlayingValidation,
    activeSlotIdx,
    targetInstrument,
    targetAudioConfig,
    blocksCount,
    isTimelineFull,
    countdownValue,
    currentPlayMeasure,
    startMeasure,
    endMeasure,
    sourceMeasure,
    sequenceAudio,
    startListening,
    startValidation,
    handleReserveClick,
    handleSlotClick,
    setActiveSlotIdx,
    cleanUpAudio
  };
}
