import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Square, Check, X, RotateCcw, ArrowRight, HelpCircle } from 'lucide-react';
import { audioEngine } from '../hooks/useAudioSync';
import { instrumentsConfig } from '../data';
import { instrumentAudioConfigs } from '../data/audioConfig';
import { TrackGroup } from '../types';

interface DicteeEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

interface Block {
  id: string;
  label: string; // e.g. "D D e D", "16 pas vides", etc.
  strokes: string[]; // actual strokes
  originalIndex: number;
}

export const DicteeEngine: React.FC<DicteeEngineProps> = ({ lang, onExit, onSuccess, exerciseData }) => {
  const [placedBlocks, setPlacedBlocks] = useState<(Block | null)[]>([]);
  const [reserveBlocks, setReserveBlocks] = useState<Block[]>([]);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);
  const [blockValidations, setBlockValidations] = useState<('idle' | 'success' | 'failure')[]>([]);
  const [isAnimatingValidation, setIsAnimatingValidation] = useState(false);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const scheduledEventIdsRef = useRef<number[]>([]);
  const clickSynthRef = useRef<Tone.Synth | null>(null);

  // Focus and keyboard for 16 mode
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  const targetTrackId = exerciseData?.instrument_cible || '';
  const blocksCount = exerciseData?.nombre_de_blocs || 4; // 4, 8, 16
  const bpm = exerciseData?.bpm || 83;
  const sequenceAudio: TrackGroup[] = exerciseData?.sequence_audio || [];

  const targetTrack = useMemo(() => {
    return sequenceAudio.find(t => t.id === targetTrackId);
  }, [sequenceAudio, targetTrackId]);

  const targetInstIdx = targetTrack?.instrumentIdx ?? -1;
  const targetInstrument = targetInstIdx !== -1 ? instrumentsConfig[targetInstIdx] : null;
  const targetAudioConfig = targetInstrument ? instrumentAudioConfigs.find(c => c.id === targetInstrument.id) : null;

  // Initialize the level (chunking)
  useEffect(() => {
    if (!targetTrack) return;
    
    // Extract the 16 steps of the target pattern
    const steps: string[] = new Array(16).fill('0');
    if (targetTrack.patterns && targetTrack.patterns[0] && targetTrack.patterns[0].activeSteps) {
      const activeSteps = targetTrack.patterns[0].activeSteps;
      for (let i = 0; i < 16; i++) {
        if (activeSteps[i]) {
          steps[i] = activeSteps[i];
        }
      }
    }

    const newBlocks: Block[] = [];
    if (blocksCount === 16) {
      // 16 mode: Empty slots, keyboard input
      setPlacedBlocks(new Array(16).fill(null));
      setReserveBlocks([]);
      return;
    }

    const stepPerBlock = 16 / blocksCount; // 4 or 2
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

    // Shuffle the blocks
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
      try { Tone.Transport.clear(id); } catch (_) {}
    });
    scheduledEventIdsRef.current = [];

    if (clickSynthRef.current) {
      try { clickSynthRef.current.dispose(); } catch (_) {}
      clickSynthRef.current = null;
    }

    try { Tone.Transport.stop(); } catch (_) {}
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

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    clickSynthRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -6
    }).toDestination();

    Tone.Transport.bpm.value = bpm;
    
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }

    const t0 = Tone.Transport.seconds + 0.1;
    const beatDuration = 60 / bpm;
    const stepDuration = beatDuration / 4;

    // 1. Countdown
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatDuration;
      const id = Tone.Transport.schedule((time) => {
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
          const stroke = activeSteps[i];
          const time = playStartTime + i * stepDuration;
          const vol = volumes[i] ?? 80;
          const volMultiplier = vol / 100;
          
          const id = Tone.Transport.schedule((time) => {
            if (audioEngine) {
              audioEngine.playNote(inst.id, stroke, time, volMultiplier, 1.0);
            }
          }, time);
          scheduledEventIdsRef.current.push(id);
        }
      }
    });

    // 3. Stop
    const endId = Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
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
    if (blocksCount !== 16) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSlotIdx === null) return;
      if (!targetAudioConfig) return;

      const key = e.key.toLowerCase();
      // Backspace to clear
      if (key === 'backspace' || key === 'delete') {
        const nextPlaced = [...placedBlocks];
        nextPlaced[activeSlotIdx] = null;
        setPlacedBlocks(nextPlaced);
        // Move prev
        setActiveSlotIdx(prev => prev! > 0 ? prev! - 1 : prev);
        return;
      }

            const targetStroke = targetAudioConfig.strokes.find((s: any) => 
        s.keys.map((k: string) => k.toLowerCase()).includes(key)
      );

      if (targetStroke) {
        const strokeSymbol = targetStroke.symbol;
        const nextPlaced = [...placedBlocks];
        nextPlaced[activeSlotIdx] = {
          id: `block_16_${activeSlotIdx}`,
          label: strokeSymbol,
          strokes: [strokeSymbol],
          originalIndex: activeSlotIdx
        };
        setPlacedBlocks(nextPlaced);
        
        // Auto-advance
        if (activeSlotIdx < 15) {
          setActiveSlotIdx(activeSlotIdx + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlotIdx, placedBlocks, blocksCount, targetInstrument]);

    const handleValidate = () => {
    if (isAnimatingValidation) return;

    if (blocksCount !== 16) {
      if (placedBlocks.some((b) => b === null)) return;
    }
    
    setIsAnimatingValidation(true);
    setBlockValidations(new Array(blocksCount).fill('idle'));
    let hasError = false;

    const animateBlock = (idx: number) => {
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
          const target = (activeSteps[idx] && activeSteps[idx] !== '0') ? activeSteps[idx] : null;
          const placed = placedBlocks[idx]?.strokes[0] || null;
          isCorrect = target === placed;
        }
        
        if (!isCorrect) hasError = true;
        next[idx] = isCorrect ? 'success' : 'failure';
        return next;
      });
      
      setTimeout(() => animateBlock(idx + 1), 300);
    };

    animateBlock(0);
  };

  const isTimelineFull = blocksCount === 16 ? true : placedBlocks.every((b) => b !== null);

  const t = {
    fr: {
      title: "Dictée Rythmique",
      subtitle: "Reconstituez la phrase",
      reserveTitle: "Réserve de Blocs",
      timelineTitle: "Votre Ligne de Temps",
      btnTest: "Tester",
      btnStop: "Stop",
      btnValidate: "Valider",
      btnExit: "Quitter le jeu",
      emptySlotHint: "Tapotez ici",
      successMsg: "Félicitations ! Le motif rythmique est exact !",
      failureMsg: "Oups ! Il y a des erreurs, réessayez !",
      restartGame: "Recommencer",
      missingBlocks: "Complétez avant de valider !",
      targetInst: "Instrument cible",
      keyboardLegend: "Touches disponibles :"
    },
    pt: {
      title: "Ditado Rítmico",
      subtitle: "Reconstitua a frase",
      reserveTitle: "Reserva de Blocos",
      timelineTitle: "Sua Linha de Tempo",
      btnTest: "Testar",
      btnStop: "Parar",
      btnValidate: "Validar",
      btnExit: "Sair do jogo",
      emptySlotHint: "Toque aqui",
      successMsg: "Parabéns! O padrão rítmico está exato!",
      failureMsg: "Opa! Há erros, tente novamente!",
      restartGame: "Recomeçar",
      missingBlocks: "Complete antes de validar!",
      targetInst: "Instrumento alvo",
      keyboardLegend: "Teclas disponíveis:"
    }
  }[lang];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4 h-full overflow-y-auto pb-16 custom-scrollbar relative z-20">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🧩 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {targetInstrument && (
            <div className="px-3 py-1 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex items-center gap-2">
               <span className="text-[10px] uppercase font-bold opacity-60">{t.targetInst}:</span>
               <span className="font-cactus font-bold text-lg text-[var(--cordel-wood)]">{targetInstrument.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* TIMELINE AREA */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
          {t.timelineTitle}
        </span>
        <div className={`grid gap-2 ${blocksCount === 16 ? 'grid-cols-8 md:grid-cols-16' : (blocksCount === 8 ? 'grid-cols-4 md:grid-cols-8' : 'grid-cols-4')}`}>
          {placedBlocks.map((block, idx) => {
            const isSelected = activeSlotIdx === idx;
            const validation = blockValidations[idx] || 'idle';
            const validationClass = validation === 'success' 
              ? 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
              : validation === 'failure' 
              ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
              : block ? 'border-[var(--cordel-border)] bg-[#fdfaf2]' : 'border-dashed border-[var(--cordel-border)]/40 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/5';

            return (
              <button
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`h-16 md:h-20 rounded border-2 relative transition-all duration-300 flex flex-col items-center justify-center p-1 cursor-pointer overflow-hidden ${
                  isSelected && validation === 'idle' ? 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 scale-[1.03]' : validationClass
                }`}
              >
                {block ? (
                  <>
                    <span className="font-cactus text-sm md:text-lg font-black text-[var(--cordel-text)]">
                      {block.label}
                    </span>
                    {blocksCount !== 16 && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-40">✕</span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-[var(--cordel-text)]/30">
                    <span className="text-xs font-mono">{idx + 1}</span>
                    {blocksCount !== 16 && (
                      <span className="text-[6px] uppercase tracking-wider text-center">
                        {t.emptySlotHint}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyboard legend for 16 blocks */}
      {blocksCount === 16 && targetAudioConfig && (
        <div className="p-3 border border-dashed border-[var(--cordel-border)]/50 bg-black/5 flex flex-col gap-2">
           <span className="text-[10px] uppercase font-bold opacity-60 flex items-center gap-1">
             <HelpCircle className="w-3 h-3" /> {t.keyboardLegend}
           </span>
           <div className="flex flex-wrap gap-2">
             {targetAudioConfig.strokes.map((s: any) => (
               <div key={s.symbol} className="flex items-center gap-1 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] px-2 py-1 rounded">
                 <kbd className="font-mono font-bold text-xs bg-[var(--cordel-text)] text-[var(--cordel-bg)] px-1.5 py-0.5 rounded shadow">
                   {s.symbol}
                 </kbd>
               </div>
             ))}
             <div className="flex items-center gap-1 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] px-2 py-1 rounded">
                <kbd className="font-mono font-bold text-xs bg-[var(--cordel-text)]/20 text-[var(--cordel-text)] px-1.5 py-0.5 rounded shadow">
                  Backspace
                </kbd>
                <span className="text-[10px] truncate max-w-[100px]">Effacer</span>
             </div>
           </div>
        </div>
      )}

      {/* RESERVE AREA */}
      {blocksCount !== 16 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
            {t.reserveTitle}
          </span>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 min-h-[80px] p-3 border-2 border-dashed border-[var(--cordel-border)]/20 bg-[var(--cordel-bg)]/20 relative">
            {reserveBlocks.map((block) => {
              const isActive = activeTileId === block.id;
              return (
                <button
                  key={block.id}
                  onClick={() => handleReserveClick(block)}
                  className={`h-16 md:h-20 rounded border-2 transition-all duration-150 flex flex-col items-center justify-center p-1 cursor-pointer hover:scale-[1.02] ${
                    isActive
                      ? 'border-dashed border-[3px] border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 rotate-[-1.5deg] scale-[0.98]'
                      : 'border-[var(--cordel-border)] bg-[#e0dcd3] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                  }`}
                >
                  <span className={`font-cactus text-sm md:text-base font-extrabold ${isActive ? 'text-[var(--cordel-wood)]' : 'text-[var(--cordel-text)]'}`}>
                    {block.label}
                  </span>
                </button>
              );
            })}
            {reserveBlocks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--cordel-text)]/30 uppercase tracking-widest pointer-events-none">
                Tout est placé !
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Feedback */}
      {validationResult !== null && (
        <div 
          className={`p-4 border-3 text-center flex flex-col items-center justify-center relative rotate-[-1deg] ${
            validationResult === 'success' 
              ? 'border-green-600 bg-green-500/10 text-green-700' 
              : 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)]'
          }`}
        >
          <div className="flex items-center gap-2 z-10">
            {validationResult === 'success' ? <Check className="w-5 h-5 text-green-600 shrink-0" /> : <X className="w-5 h-5 text-[var(--cordel-wood)] shrink-0" />}
            <span className="font-cactus font-bold text-sm">
              {validationResult === 'success' ? t.successMsg : t.failureMsg}
            </span>
          </div>
        </div>
      )}

      {/* Core Action Buttons */}
      <div className="flex flex-wrap md:grid md:grid-cols-3 gap-3 border-t-2 border-[var(--cordel-border)] pt-4 mt-auto">
        <button
          onClick={playSequence}
          className={`flex-1 md:flex-none px-3 py-3 font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-100 ${
            isPlaying 
              ? 'bg-[var(--cordel-wood)] text-white hover:opacity-90' 
              : 'bg-yellow-600 text-white hover:opacity-95'
          }`}
        >
          {isPlaying ? <><Square className="w-4 h-4 fill-current" /> {t.btnStop}</> : <><Play className="w-4 h-4 fill-current" /> {t.btnTest}</>}
        </button>

        <button
          onClick={handleValidate}
          disabled={!isTimelineFull || isPlaying}
          className="flex-1 md:flex-none px-3 py-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-95"
          title={!isTimelineFull ? t.missingBlocks : ''}
        >
          <Check className="w-4 h-4" /> {t.btnValidate}
        </button>

        {validationResult === 'success' ? (
          <button
            onClick={() => onSuccess?.()}
            className="w-full md:w-auto px-3 py-3 bg-green-700 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90 col-span-full md:col-span-1"
          >
            <ArrowRight className="w-4 h-4" /> Continuer
          </button>
        ) : (
          <button
            onClick={onExit}
            className="w-full md:w-auto px-3 py-3 bg-neutral-800 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] col-span-full md:col-span-1"
          >
            {t.btnExit}
          </button>
        )}
      </div>
    </div>
  );
};
