import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Check, X, RotateCcw, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { DicteeBlock, DicteeLevel, dicteeLevels } from '../data/dicteeData';

interface DicteeEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
}

// Helper to shuffle blocks in the reserve
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const DicteeEngine: React.FC<DicteeEngineProps> = ({ lang, onExit, onSuccess }) => {
  // Game states
  const [levelIndex, setLevelIndex] = useState<number>(0);
  const [placedBlocks, setPlacedBlocks] = useState<(DicteeBlock | null)[]>([null, null, null, null]);
  const [reserveBlocks, setReserveBlocks] = useState<DicteeBlock[]>([]);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<'success' | 'failure' | null>(null);

  useEffect(() => {
    if (validationResult === 'success' && levelIndex === dicteeLevels.length - 1) {
      onSuccess?.();
    }
  }, [validationResult, levelIndex, onSuccess]);
  
  // Audio sequence playing states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playingIndex, setPlayingIndex] = useState<number>(-1);
  
  const playbackActiveRef = useRef<boolean>(false);
  const playbackTimeoutRef = useRef<number | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  const activeLevel = dicteeLevels[levelIndex];

  // Initialize level
  useEffect(() => {
    initLevel();
    return () => {
      stopSequence();
    };
  }, [levelIndex]);

  const initLevel = () => {
    stopSequence();
    setPlacedBlocks([null, null, null, null]);
    setActiveTileId(null);
    setValidationResult(null);
    // Shuffle the reserve blocks for the level
    setReserveBlocks(shuffleArray(activeLevel.blocks));
  };

  const stopSequence = () => {
    playbackActiveRef.current = false;
    if (playbackTimeoutRef.current !== null) {
      window.clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    // Stop all active audios
    audioElementsRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    });
    audioElementsRef.current = [];
    setIsPlaying(false);
    setPlayingIndex(-1);
  };

  const playSequence = async () => {
    if (isPlaying) {
      stopSequence();
      return;
    }

    setIsPlaying(true);
    setValidationResult(null);
    playbackActiveRef.current = true;
    audioElementsRef.current = [];

    const baseUrl = (import.meta as any).env.BASE_URL || '/';

    for (let i = 0; i < 4; i++) {
      if (!playbackActiveRef.current) break;
      setPlayingIndex(i);
      
      const block = placedBlocks[i];
      if (block) {
        try {
          const fullUrl = `${baseUrl}${block.audioUrl}`.replace(/\/+/g, '/');
          const audio = new Audio(fullUrl);
          audioElementsRef.current.push(audio);
          audio.play().catch((err) => console.warn("Audio play blocked:", err));
        } catch (e) {
          console.warn("Audio initiation failed:", e);
        }
      }

      // Wait 600ms for the next beat
      await new Promise<void>((resolve) => {
        playbackTimeoutRef.current = window.setTimeout(() => {
          resolve();
        }, 600);
      });
    }

    if (playbackActiveRef.current) {
      setIsPlaying(false);
      setPlayingIndex(-1);
    }
  };

  // Interactions: Reserve click
  const handleReserveClick = (block: DicteeBlock) => {
    if (isPlaying) stopSequence();
    if (activeTileId === block.id) {
      setActiveTileId(null); // deselect
    } else {
      setActiveTileId(block.id); // select
    }
  };

  // Interactions: Timeline slot click
  const handleSlotClick = (slotIdx: number) => {
    if (isPlaying) stopSequence();
    const existingBlock = placedBlocks[slotIdx];

    // Case 1: Place active block in slot
    if (activeTileId !== null) {
      const activeBlock = reserveBlocks.find((b) => b.id === activeTileId);
      if (!activeBlock) return;

      const nextPlaced = [...placedBlocks];
      
      // If there was already a block in this slot, return it to the reserve
      if (existingBlock) {
        setReserveBlocks((prev) => [...prev.filter((b) => b.id !== activeTileId), existingBlock]);
      } else {
        setReserveBlocks((prev) => prev.filter((b) => b.id !== activeTileId));
      }

      nextPlaced[slotIdx] = activeBlock;
      setPlacedBlocks(nextPlaced);
      setActiveTileId(null);
      setValidationResult(null);
    } 
    // Case 2: Remove placed block from slot (when no tile is active)
    else if (existingBlock) {
      const nextPlaced = [...placedBlocks];
      nextPlaced[slotIdx] = null;
      setPlacedBlocks(nextPlaced);
      setReserveBlocks((prev) => [...prev, existingBlock]);
      setValidationResult(null);
    }
  };

  const handleValidate = () => {
    // Check if timeline is complete
    if (placedBlocks.some((b) => b === null)) {
      return; // Not all blocks placed
    }

    const placedLabels = placedBlocks.map((b) => b?.label || '');
    const targetLabels = activeLevel.targetLabels;

    const isCorrect = placedLabels.every((label, idx) => label === targetLabels[idx]);

    if (isCorrect) {
      setValidationResult('success');
    } else {
      setValidationResult('failure');
    }
  };

  const handleNextLevel = () => {
    if (levelIndex < dicteeLevels.length - 1) {
      setLevelIndex(levelIndex + 1);
    }
  };

  const handlePrevLevel = () => {
    if (levelIndex > 0) {
      setLevelIndex(levelIndex - 1);
    }
  };

  const isTimelineFull = placedBlocks.every((b) => b !== null);

  const t = {
    fr: {
      title: "La Dictée de Blocs",
      subtitle: "Reconstituez la phrase rythmique",
      level: "Niveau",
      of: "sur",
      reserveTitle: "Réserve de Blocs",
      timelineTitle: "Votre Ligne de Temps",
      btnTest: "Tester",
      btnStop: "Stop",
      btnValidate: "Valider",
      btnNextLevel: "Niveau Suivant",
      btnExit: "Quitter le jeu",
      emptySlotHint: "Tapotez ici pour placer",
      instructions: "Astuce : Appuyez sur une tuile de la réserve pour la sélectionner, puis appuyez sur un emplacement vide de la ligne de temps en haut pour la poser.",
      successMsg: "Félicitations ! Le motif rythmique est parfaitement ordonné !",
      failureMsg: "Oups ! La phrase n'est pas correcte. Modifiez la place des blocs et réessayez !",
      allLevelsComplete: "Félicitations ! Vous avez terminé toutes les dictées rythmiques !",
      restartGame: "Recommencer au niveau 1",
      missingBlocks: "Placez les 4 blocs avant de valider !"
    },
    pt: {
      title: "Ditado de Blocos",
      subtitle: "Reconstitua a frase rítmica",
      level: "Nível",
      of: "de",
      reserveTitle: "Reserva de Blocos",
      timelineTitle: "Sua Linha de Tempo",
      btnTest: "Testar",
      btnStop: "Parar",
      btnValidate: "Validar",
      btnNextLevel: "Próximo Nível",
      btnExit: "Sair do jogo",
      emptySlotHint: "Toque aqui para colocar",
      instructions: "Dica: Toque em uma peça da reserva para selecionar e depois toque em um espaço vazio da linha superior para colocá-la.",
      successMsg: "Parabéns! O padrão rítmico está perfeitamente ordenado!",
      failureMsg: "Opa! A frase não está correta. Mude a posição dos blocos e tente novamente!",
      allLevelsComplete: "Parabéns! Você concluiu todos os ditados rítmicos!",
      restartGame: "Recomeçar no nível 1",
      missingBlocks: "Coloque os 4 blocos antes de validar!"
    }
  }[lang];

  return (
    <div className="w-full max-w-xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🧩 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevLevel}
            disabled={levelIndex === 0}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] disabled:opacity-30 cursor-pointer"
            title="Niveau précédent"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold font-mono px-2 py-1 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm">
            {t.level} {activeLevel.id} {t.of} {dicteeLevels.length}
          </span>
          <button
            onClick={handleNextLevel}
            disabled={levelIndex === dicteeLevels.length - 1}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] disabled:opacity-30 cursor-pointer"
            title="Niveau suivant"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Level Info & Target Description */}
      <div className="p-4 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)]/50 rounded-sm">
        <h3 className="font-cactus text-sm font-bold text-[var(--cordel-text)] uppercase mb-1">
          🎵 {activeLevel.title[lang]}
        </h3>
        <p className="text-xs text-[var(--cordel-text)]/80 leading-relaxed font-cactus">
          {activeLevel.description[lang]}
        </p>
      </div>

      {/* TIMELINE AREA (4 slots) */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
          {t.timelineTitle}
        </span>
        <div className="grid grid-cols-4 gap-3">
          {placedBlocks.map((block, idx) => {
            const isPlayingThis = playingIndex === idx;
            
            return (
              <button
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className={`h-24 rounded border-2 relative transition-all duration-150 flex flex-col items-center justify-center p-1 cursor-pointer overflow-hidden ${
                  isPlayingThis
                    ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.5)] scale-[1.03]'
                    : block
                      ? 'border-[var(--cordel-border)]'
                      : 'border-dashed border-[var(--cordel-border)]/40 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/5'
                }`}
                style={block ? { backgroundColor: block.color + '22', borderColor: block.color } : {}}
              >
                {block ? (
                  <>
                    <span className="font-cactus text-lg font-black" style={{ color: block.color }}>
                      {block.label}
                    </span>
                    <span className="text-[8px] text-[var(--cordel-text)]/70 uppercase tracking-widest text-center mt-1 truncate w-full">
                      {block.instrument[lang]}
                    </span>
                    {/* Small tag return visual */}
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-40">✕</span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-[var(--cordel-text)]/30">
                    <span className="text-sm font-mono">{idx + 1}</span>
                    <span className="text-[7px] uppercase tracking-wider text-center px-0.5">
                      {t.emptySlotHint}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RESERVE AREA (Available Shuffled Blocks) */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
          {t.reserveTitle}
        </span>
        <div className="grid grid-cols-4 gap-3 min-h-[96px] p-3 border-2 border-dashed border-[var(--cordel-border)]/20 bg-[var(--cordel-bg)]/20 relative">
          {reserveBlocks.map((block) => {
            const isActive = activeTileId === block.id;
            
            return (
              <button
                key={block.id}
                onClick={() => handleReserveClick(block)}
                className={`h-20 rounded border-2 transition-all duration-150 flex flex-col items-center justify-center p-1 cursor-pointer hover:scale-[1.02] ${
                  isActive
                    ? 'border-dashed border-[3px] border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 rotate-[-1.5deg] scale-[0.98]'
                    : 'border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                }`}
                style={{ borderColor: block.color }}
              >
                <span className="font-cactus text-base font-extrabold" style={isActive ? { color: 'var(--cordel-wood)' } : { color: block.color }}>
                  {block.label}
                </span>
                <span className={`text-[7px] uppercase tracking-wider text-center mt-1 truncate w-full ${isActive ? 'text-[var(--cordel-wood)]/80' : 'text-[var(--cordel-text)]/60'}`}>
                  {block.instrument[lang]}
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

      {/* Tip Box */}
      <div className="flex gap-2 items-start text-[10px] text-[var(--cordel-text)]/60 leading-normal p-2 border border-dashed border-[var(--cordel-border)]/25 bg-black/5">
        <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{t.instructions}</span>
      </div>

      {/* Validation Feedback Message Stamp */}
      {validationResult !== null && (
        <div 
          className={`p-4 border-3 text-center flex flex-col items-center justify-center relative rotate-[-1deg] ${
            validationResult === 'success' 
              ? 'border-green-600 bg-green-500/10 text-green-700' 
              : 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)]'
          }`}
        >
          {/* Stamp visual symbol */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] text-8xl font-black opacity-10 pointer-events-none font-cactus">
            {validationResult === 'success' ? 'OK' : 'X'}
          </div>

          <div className="flex items-center gap-2 z-10">
            {validationResult === 'success' ? (
              <Check className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <X className="w-5 h-5 text-[var(--cordel-wood)] shrink-0" />
            )}
            <span className="font-cactus font-bold text-sm">
              {validationResult === 'success' ? t.successMsg : t.failureMsg}
            </span>
          </div>
        </div>
      )}

      {/* Core Action Buttons */}
      <div className="grid grid-cols-3 gap-3 border-t-2 border-[var(--cordel-border)] pt-4">
        {/* Play/Test Button */}
        <button
          onClick={playSequence}
          className={`px-3 py-2.5 font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-100 ${
            isPlaying 
              ? 'bg-[var(--cordel-wood)] text-white hover:opacity-90 active:translate-y-0.5' 
              : 'bg-yellow-600 text-white hover:opacity-95 active:translate-y-0.5'
          }`}
        >
          {isPlaying ? (
            <><Square className="w-3.5 h-3.5 fill-current" /> {t.btnStop}</>
          ) : (
            <><Play className="w-3.5 h-3.5 fill-current" /> {t.btnTest}</>
          )}
        </button>

        {/* Validation Button */}
        <button
          onClick={handleValidate}
          disabled={!isTimelineFull || isPlaying}
          className="px-3 py-2.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-95 active:translate-y-0.5"
          title={!isTimelineFull ? t.missingBlocks : ''}
        >
          <Check className="w-3.5 h-3.5" /> {t.btnValidate}
        </button>

        {/* Level Switch / Reset / Exit button */}
        {validationResult === 'success' && levelIndex < dicteeLevels.length - 1 ? (
          <button
            onClick={handleNextLevel}
            className="px-3 py-2.5 bg-green-700 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90 active:translate-y-0.5"
          >
            <ArrowRight className="w-3.5 h-3.5" /> {t.btnNextLevel}
          </button>
        ) : (
          <button
            onClick={initLevel}
            className="px-3 py-2.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] active:translate-y-0.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Exit Button */}
      {validationResult === 'success' && levelIndex === dicteeLevels.length - 1 ? (
        <div className="flex flex-col items-center gap-3 p-4 border-2 border-green-600 bg-green-500/10 text-center">
          <span className="font-cactus font-black text-sm text-green-700">{t.allLevelsComplete}</span>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setLevelIndex(0); initLevel(); }}
              className="flex-1 px-3 py-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-xs font-bold uppercase cordel-border cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
            >
              {t.restartGame}
            </button>
            <button
              onClick={onExit}
              className="flex-1 px-3 py-2 bg-neutral-800 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
            >
              {t.btnExit}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onExit}
          className="w-full py-2 bg-neutral-800 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] mt-2"
        >
          {t.btnExit}
        </button>
      )}
    </div>
  );
};
