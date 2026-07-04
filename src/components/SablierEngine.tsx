import React from 'react';
import { Play, Square, Clock, ArrowLeft } from 'lucide-react';
import { useSablierGame } from '../hooks/useSablierGame';

interface SablierEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

export const SablierEngine: React.FC<SablierEngineProps> = ({
  lang,
  onExit,
  onSuccess,
  exerciseData
}) => {
  const {
    gameState,
    timeLeft,
    options,
    isSoloPlaying,
    targetInstrument,
    signImage,
    playBaseLoop,
    handleValidation,
    playSoloOption
  } = useSablierGame({ lang, onSuccess, exerciseData });

  return (
    <div className="w-full h-full overflow-y-auto cordel-bg select-none font-sans flex flex-col p-4 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-4 mb-6 relative">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'fr' ? 'Retour' : 'Voltar'}
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="font-cactus text-3xl uppercase tracking-wider text-[var(--cordel-text)] font-extrabold flex items-center gap-2">
            <Clock className="w-8 h-8" />
            {exerciseData?.folheto_titre || "Le Sablier"}
          </h2>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full max-w-6xl mx-auto w-full">
        {/* Left Column: Sign & Timer */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] p-6 cordel-border flex flex-col items-center justify-center gap-4 text-center min-h-[300px] relative overflow-hidden">
            
            {/* Background Animation for Sablier */}
            {gameState === 'sablier_active' && (
              <div 
                className="absolute bottom-0 left-0 right-0 bg-red-500/20 transition-all duration-1000 ease-linear h-full"
                style={{ transform: `scaleY(${timeLeft / 2})`, transformOrigin: 'bottom' }}
              />
            )}

            <Clock className={`w-16 h-16 transition-all ${gameState === 'sablier_active' ? 'text-red-500 animate-pulse' : 'text-[var(--cordel-wood)]'}`} />
            
            <h3 className="font-cactus text-xl font-bold text-[var(--cordel-wood)] z-10">
              {gameState === 'idle' && (lang === 'fr' ? "Prêt ?" : "Pronto ?")}
              {gameState === 'playing_base' && (lang === 'fr' ? "Écoutez la base..." : "Ouça a base...")}
              {gameState === 'sablier_active' && (lang === 'fr' ? "Vite ! Choisissez la suite !" : "Rápido! Escolha a continuação!")}
              {gameState === 'success' && (lang === 'fr' ? "Bravo !" : "Parabéns!")}
              {gameState === 'failure' && (lang === 'fr' ? "Temps écoulé ou erreur !" : "Tempo esgotado ou erro!")}
            </h3>

            {gameState === 'sablier_active' && signImage && (
              <div className="z-10 animate-bounce mt-4">
                <img src={signImage} alt="Signe" className="max-h-32 object-contain border-4 border-red-500 rounded p-1 bg-white" />
              </div>
            )}

            {gameState === 'idle' && (
              <button
                onClick={playBaseLoop}
                className="mt-6 px-8 py-3 bg-[var(--cordel-wood)] text-white font-cactus font-bold text-lg uppercase cordel-button cursor-pointer flex items-center gap-2 hover:opacity-90"
              >
                <Play className="w-5 h-5 fill-current" />
                {lang === 'fr' ? "Commencer" : "Começar"}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Choices */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="border-2 border-[var(--cordel-border)] p-6 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-6">
            <h3 className="font-cactus text-lg font-bold text-[var(--cordel-wood)] border-b-2 border-dashed border-[var(--cordel-wood)]/30 pb-2">
              {lang === 'fr' ? `Options (${targetInstrument.toUpperCase()})` : `Opções (${targetInstrument.toUpperCase()})`}
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-4 bg-black/5 p-3 rounded border border-[var(--cordel-border)]/20">
                  <button
                    onClick={() => playSoloOption(opt)}
                    disabled={gameState !== 'idle'}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-[var(--cordel-border)] cordel-button ${
                      isSoloPlaying === opt.id ? 'bg-[var(--cordel-wood)] text-white' : 'bg-white text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-white'
                    } ${gameState !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title="Pré-écoute"
                  >
                    {isSoloPlaying === opt.id ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  
                  {/* Visualizer (Simple Blocks) */}
                  <div className="flex-1 flex gap-1 items-center h-8 bg-white border border-[var(--cordel-border)]/30 p-1">
                    {opt.track.patterns[0].activeSteps.map((step: any, sIdx: number) => (
                       <div key={sIdx} className={`h-full flex-1 ${(step !== 0 && step !== '0' && step !== null) ? 'bg-[var(--cordel-wood)]' : 'bg-transparent'}`} />
                    ))}
                  </div>

                  <button
                    onClick={() => handleValidation(opt.type)}
                    disabled={gameState !== 'sablier_active'}
                    className={`px-6 py-2 font-cactus font-bold uppercase border-2 cordel-button ${
                      gameState === 'sablier_active' 
                        ? 'bg-[#27ae60] text-white border-[#27ae60] cursor-pointer animate-pulse'
                        : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {lang === 'fr' ? "C'est ça !" : "É esse!"}
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
