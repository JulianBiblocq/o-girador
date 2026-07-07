import React, { Suspense, useMemo } from 'react';
import { Play, Square, Check, X, ArrowRight, HelpCircle } from 'lucide-react';
import { useDicteeGame } from '../hooks/useDicteeGame';

const CircleSequencer = React.lazy(() => import('./CircleSequencer').then(m => ({ default: m.CircleSequencer })));

interface DicteeEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

export const DicteeEngine: React.FC<DicteeEngineProps> = ({ lang, onExit, onSuccess, exerciseData }) => {
  const {
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
  } = useDicteeGame({ onSuccess, exerciseData });

  const t = {
    fr: {
      title: "Dictée de blocs",
      subtitle: "Reconstituez la phrase rythmique de la Caixa",
      reserveTitle: "Réserve de Blocs",
      timelineTitle: "Votre Ligne de Temps",
      btnTest: "Lecture (Écoute)",
      btnStop: "Stop",
      btnValidate: "Valider la Réponse",
      btnExit: "Quitter le jeu",
      emptySlotHint: "Placer ici",
      successMsg: "Félicitations ! Le motif rythmique est exact !",
      failureMsg: "Oups ! Il y a des erreurs, réessayez !",
      restartGame: "Recommencer",
      missingBlocks: "Complétez la ligne de temps avant de valider !",
      targetInst: "Instrument cible",
      keyboardLegend: "Touches disponibles :",
      rangeLabel: "Plage d'écoute :",
      dictationLabel: "Mesure de la dictée :",
    },
    pt: {
      title: "Ditado de blocos",
      subtitle: "Reconstitua a frase rítmica da Caixa",
      reserveTitle: "Reserva de Blocos",
      timelineTitle: "Sua Linha de Tempo",
      btnTest: "Leitura (Escuta)",
      btnStop: "Parar",
      btnValidate: "Validar Resposta",
      btnExit: "Sair do jogo",
      emptySlotHint: "Colocar aqui",
      successMsg: "Parabéns! O padrão rítmico está exato!",
      failureMsg: "Opa! Há erros, tente novamente!",
      restartGame: "Recomeçar",
      missingBlocks: "Complete a linha de tempo antes de validar!",
      targetInst: "Instrumento alvo",
      keyboardLegend: "Teclas disponíveis:",
      rangeLabel: "Faixa de escuta:",
      dictationLabel: "Compasso do ditado:",
    }
  }[lang];

  // Mask target instrument (e.g. Caixa) notes on the Roda sequencer for the target range.
  // When validating is active, show the user's placed notes on the source measure, and original notes on other measures.
  const maskedTracks = useMemo(() => {
    if (!sequenceAudio || !targetInstrument) return [];
    
    return sequenceAudio.map((track) => {
      const isTarget = track.id === targetInstrument.id || track.instrumentIdx === targetInstrument.instrumentIdx;
      if (isTarget) {
        return {
          ...track,
          patterns: track.patterns.map((pat, idx) => {
            if (isPlayingValidation) {
              // On the dictation measure, display the user's placed notes
              if (idx === sourceMeasure - 1) {
                const steps = Array(16).fill(0);
                const notes = Array(16).fill('');
                const lyrics = Array(16).fill('');
                const stepPerBlock = 16 / blocksCount;
                
                for (let b = 0; b < blocksCount; b++) {
                  const block = placedBlocks[b];
                  if (block) {
                    for (let s = 0; s < stepPerBlock; s++) {
                      const stroke = block.strokes[s];
                      if (stroke && stroke !== '0' && stroke !== '-') {
                        steps[b * stepPerBlock + s] = stroke;
                        notes[b * stepPerBlock + s] = stroke;
                        lyrics[b * stepPerBlock + s] = stroke;
                      }
                    }
                  }
                }
                return {
                  ...pat,
                  activeSteps: steps,
                  notes,
                  lyrics
                };
              }
              // Other measures play original notes
              return pat;
            }

            // Muted/masked range in normal game
            if (idx >= startMeasure - 1 && idx <= endMeasure - 1) {
              return {
                ...pat,
                activeSteps: Array(16).fill(0),
                notes: Array(16).fill(''),
                lyrics: Array(16).fill(''),
              };
            }
            return pat;
          }),
        };
      }
      return track;
    });
  }, [sequenceAudio, targetInstrument, startMeasure, endMeasure, sourceMeasure, isPlayingValidation, placedBlocks, blocksCount]);

  // Active patterns map for other instruments rendering
  const activePatternMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (sequenceAudio) {
      sequenceAudio.forEach(t => {
        if (t.patterns && t.patterns[currentPlayMeasure]) {
          map[t.id] = t.patterns[currentPlayMeasure].id;
        } else if (t.patterns && t.patterns[0]) {
          map[t.id] = t.patterns[0].id;
        }
      });
    }
    return map;
  }, [sequenceAudio, currentPlayMeasure]);

  // Helper to render colored notes list inside blocks
  const renderStrokesList = (strokes: string[], isPlaced = false, validationState: 'idle' | 'success' | 'failure' = 'idle') => {
    if (!targetInstrument) return null;
    return (
      <div className="flex gap-1 items-center justify-center w-full">
        {strokes.map((stroke, sIdx) => {
          const isEmpty = stroke === '0' || stroke === '-';
          let strokeBg = '#fdfaf2';
          if (!isEmpty) {
            strokeBg = targetInstrument.colors?.[stroke] || targetInstrument.colors?.['D'] || '#7a3187';
          }
          const isAccent = stroke !== '0' && stroke !== '-' && stroke === stroke.toUpperCase();

          let borderClass = 'border-black/10';
          if (isPlaced) {
            if (validationState === 'success') borderClass = 'border-green-600';
            else if (validationState === 'failure') borderClass = 'border-red-600';
          }

          return (
            <div
              key={sIdx}
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center font-bold text-xs sm:text-sm border-2 ${
                isEmpty 
                  ? 'border-dashed border-[var(--cordel-border)]/40 bg-transparent text-[var(--cordel-text)]/20' 
                  : 'text-white font-black shadow-sm'
              } transition-all`}
              style={{
                backgroundColor: isEmpty ? undefined : strokeBg,
                borderColor: isEmpty ? undefined : (isAccent ? '#ffffff' : borderClass),
                boxShadow: !isEmpty && isAccent ? '0 0 4px rgba(255, 255, 255, 0.8)' : undefined
              }}
            >
              {isEmpty ? '' : stroke}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4 h-full overflow-y-auto pb-16 custom-scrollbar relative z-20">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🧩 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {targetInstrument && (
            <div className="px-3 py-1 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex items-center gap-2 shadow-[2px_2px_0px_var(--cordel-border)]">
               <span className="text-[10px] uppercase font-bold opacity-60">{t.targetInst}:</span>
               <span className="font-cactus font-bold text-base text-[var(--cordel-wood)]">{targetInstrument.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Roda Sequencer & Countdown */}
        <div className="flex flex-col gap-4 border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border relative overflow-hidden items-center justify-center min-h-[420px] shadow-sm">
          <div className="w-full text-center border-b border-dashed border-[var(--cordel-border)]/20 pb-2 mb-2 flex justify-between items-center px-2 text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">
            <span>{t.rangeLabel} Compasso {startMeasure} à {endMeasure}</span>
            <span className="text-[var(--cordel-wood)]">{t.dictationLabel} Compasso {sourceMeasure}</span>
          </div>

          <div className="w-full max-w-[380px] aspect-square relative bg-[var(--cordel-bg)]/25 rounded flex items-center justify-center">
            
            {/* Countdown Overlay */}
            {countdownValue !== null && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-all duration-300 rounded-sm">
                <div className="scale-up flex flex-col items-center justify-center p-6 bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] min-w-[180px] text-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--cordel-text)]/60 mb-2">Décompte</span>
                  <div className="w-20 h-20 rounded-full border-4 border-dashed border-[var(--cordel-wood)] flex items-center justify-center bg-[var(--cordel-wood)]/10 animate-ping absolute" />
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--cordel-border)] flex items-center justify-center bg-[var(--cordel-bg)] relative z-10">
                    <span className="font-cactus text-5xl font-black text-[var(--cordel-wood)]">{countdownValue}</span>
                  </div>
                </div>
              </div>
            )}

            <Suspense fallback={<div className="font-cactus text-sm">Chargement du séquenceur...</div>}>
              <CircleSequencer
                lang={lang}
                tracks={maskedTracks}
                isPlaying={isPlaying}
                currentMeasure={currentPlayMeasure}
                maxTicks={16}
                timeSig="4/4"
                totalMeasures={sequenceAudio[0]?.patterns?.length || 1}
                onTogglePlay={startListening}
                langPromptVoiceText=""
                activePatternIdByTrack={activePatternMap}
                bpm={effectiveExerciseData.bpm || 83}
                measureBpms={[effectiveExerciseData.bpm || 83]}
                measureVols={[80]}
                isMobile={true}
              />
            </Suspense>
          </div>

          {/* Listening Playback Control */}
          <button
            onClick={isPlaying ? () => cleanUpAudio() : startListening}
            className={`w-full max-w-[260px] py-3 mt-4 font-cactus text-sm font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-100 shadow-[3px_3px_0_var(--cordel-border)] ${
              isPlaying && !isPlayingValidation
                ? 'bg-[var(--cordel-wood)] text-white hover:opacity-90' 
                : 'bg-yellow-600 text-white hover:opacity-95'
            }`}
          >
            {isPlaying && !isPlayingValidation ? (
              <>
                <Square className="w-4 h-4 fill-current" /> {t.btnStop}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> {t.btnTest}
              </>
            )}
          </button>
        </div>

        {/* Right Column: User Timeline & Shuffled Blocks */}
        <div className="flex flex-col gap-6">
          
          {/* User Timeline */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
              {t.timelineTitle} (Compasso {sourceMeasure})
            </span>
            <div className={`grid gap-2 grid-cols-4`}>
              {placedBlocks.map((block, idx) => {
                const isSelected = activeSlotIdx === idx;
                const validation = blockValidations[idx] || 'idle';
                const validationClass = validation === 'success' 
                  ? 'border-green-600 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                  : validation === 'failure' 
                  ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : block ? 'border-[var(--cordel-border)] bg-[#fdfaf2]' : 'border-dashed border-[var(--cordel-border)]/40 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/5';

                return (
                  <button
                    key={idx}
                    onClick={() => handleSlotClick(idx)}
                    className={`h-20 sm:h-24 rounded border-2 relative transition-all duration-300 flex flex-col items-center justify-center p-1.5 cursor-pointer overflow-hidden ${
                      isSelected && validation === 'idle' ? 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 scale-[1.02]' : validationClass
                    }`}
                  >
                    {block ? (
                      <div className="flex flex-col items-center gap-1 w-full h-full justify-center">
                        <span className="text-[8px] font-mono opacity-50 uppercase tracking-widest">Bloc {idx + 1}</span>
                        {renderStrokesList(block.strokes, true, validation)}
                        <span className="absolute top-1 right-1.5 text-[8px] opacity-40">✕</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[var(--cordel-text)]/30">
                        <span className="text-xs font-mono font-bold">{idx + 1}</span>
                        {renderStrokesList(Array(16 / blocksCount).fill('0'), false)}
                        <span className="text-[7px] uppercase tracking-wider text-center font-bold">
                          {t.emptySlotHint}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reserve Blocks */}
          {blocksCount !== 16 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">
                {t.reserveTitle}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-h-[100px] p-3 border-2 border-dashed border-[var(--cordel-border)]/20 bg-[var(--cordel-bg)]/20 relative rounded-sm">
                {reserveBlocks.map((block) => {
                  const isActive = activeTileId === block.id;
                  return (
                    <button
                      key={block.id}
                      onClick={() => handleReserveClick(block)}
                      className={`h-16 sm:h-20 rounded border-2 transition-all duration-150 flex flex-col items-center justify-center p-2 cursor-pointer hover:scale-[1.02] shadow-sm ${
                        isActive
                          ? 'border-dashed border-[3px] border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/15 rotate-[-1.5deg] scale-[0.98]'
                          : 'border-[var(--cordel-border)] bg-[#e0dcd3] hover:bg-[var(--cordel-text)]/15'
                      }`}
                    >
                      {renderStrokesList(block.strokes, false)}
                    </button>
                  );
                })}
                {reserveBlocks.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--cordel-text)]/30 uppercase tracking-widest pointer-events-none font-bold">
                    Tout est placé !
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keyboard Legend for 16-step mode */}
          {blocksCount === 16 && targetAudioConfig && (
            <div className="p-3 border border-dashed border-[var(--cordel-border)]/50 bg-black/5 flex flex-col gap-2 rounded-sm">
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

          {/* Validation Banner */}
          {validationResult !== null && (
            <div 
              className={`p-4 border-3 text-center flex flex-col items-center justify-center relative rotate-[-1deg] rounded-sm transition-all duration-300 ${
                validationResult === 'success' 
                  ? 'border-green-600 bg-green-500/10 text-green-700 shadow-[0_4px_15px_rgba(34,197,94,0.1)]' 
                  : 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)] shadow-[0_4px_15px_rgba(138,43,43,0.1)]'
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

          {/* Footer Controls */}
          <div className="flex flex-wrap md:grid md:grid-cols-2 gap-3 border-t-2 border-[var(--cordel-border)] pt-4 mt-auto">
            <button
              onClick={isPlaying && isPlayingValidation ? () => cleanUpAudio() : startValidation}
              disabled={!isTimelineFull}
              className={`w-full px-3 py-3.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-95 transition-colors shadow-[3px_3px_0_var(--cordel-border)]`}
              title={!isTimelineFull ? t.missingBlocks : ''}
            >
              {isPlaying && isPlayingValidation ? (
                <>
                  <Square className="w-4 h-4" /> {t.btnStop}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> {t.btnValidate}
                </>
              )}
            </button>

            {validationResult === 'success' ? (
              <button
                onClick={() => onSuccess?.()}
                className="w-full px-3 py-3.5 bg-green-700 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90 transition-colors shadow-[3px_3px_0_var(--cordel-border)]"
              >
                <ArrowRight className="w-4 h-4" /> Continuer
              </button>
            ) : (
              <button
                onClick={onExit}
                className="w-full px-3 py-3.5 bg-neutral-800 text-white font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors shadow-[3px_3px_0_var(--cordel-border)]"
              >
                {t.btnExit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
