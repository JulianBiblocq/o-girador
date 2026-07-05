import React, { useRef } from 'react';
import { Play, Square, RotateCcw, ArrowRight, HelpCircle, Check, X } from 'lucide-react';
import { useMestreGame } from '../hooks/useMestreGame';

interface MestreEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  rhythmState: 'base' | 'variation' | 'rufo';
  setRhythmState: (state: 'base' | 'variation' | 'rufo') => void;
  onSuccess?: () => void;
  exerciseData?: any;
}

export const MestreEngine: React.FC<MestreEngineProps> = ({
  lang,
  onExit,
  rhythmState,
  setRhythmState,
  onSuccess,
  exerciseData
}) => {
  const circleRef = useRef<SVGCircleElement>(null);

  const {
    roundIdx,
    selectedOption,
    validationResult,
    isTimerRunning,
    isRoundStarted,
    activeRound,
    startRound,
    handleOptionSelect,
    handleNextRound,
  } = useMestreGame({ lang, onSuccess, setRhythmState, circleRef, exerciseData });

  const t = {
    fr: {
      title: "Le Sablier du Mestre",
      subtitle: "Réagissez au signal avant la fin du cycle !",
      instructions: "Le Mestre lève un panneau ! Choisissez la bonne action rythmique correspondante. Attention : le sablier se vide sur une durée exacte de 2 mesures. La Roda réagira au début du prochain cycle.",
      startBtn: "Commencer la manche",
      selectedStamp: "CHOISI :",
      solvedSuccess: "APROUVÉ !",
      solvedFailure: "DÉRAILLEMENT !",
      successMsg: "Bravo Mestre ! Le groupe a parfaitement basculé sur la variation rythmique au premier temps du cycle !",
      failureMsg: "Catastrophe ! Mauvaise direction ou temps écoulé. La Roda déraille en rufo (roulement de caisse claire continu) !",
      btnNext: "Manche Suivante",
      btnExit: "Quitter",
      optionLabel: "Choix",
      hourglassLabel: "Temps restant (2 mesures)"
    },
    pt: {
      title: "A Ampulheta do Mestre",
      subtitle: "Reaja ao sinal antes do fim do ciclo !",
      instructions: "O Mestre levanta um sinal! Escolha a ação rítmica correta correspondente. Atenção: a ampulheta se esvazia em exatamente 2 compassos. A Roda reage no início do próximo ciclo.",
      startBtn: "Começar rodada",
      selectedStamp: "VOTADO :",
      solvedSuccess: "APROVADO !",
      solvedFailure: "DESCOMPASSO !",
      successMsg: "Boa Mestre! O grupo mudou perfeitamente para a variação rítmica no primeiro tempo do ciclo!",
      failureMsg: "Catástrofe! Ação incorreta ou tempo esgotado. A Roda descompassou no rufo (toque de repique contínuo)!",
      btnNext: "Próxima Rodada",
      btnExit: "Sair",
      optionLabel: "Escolha",
      hourglassLabel: "Tempo restante (2 compassos)"
    }
  }[lang];

  return (
    <div className="w-full max-w-xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4">
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            ⏳ {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
        >
          {t.btnExit}
        </button>
      </div>

      {!isRoundStarted && (
        <div className="p-4 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-center flex flex-col items-center gap-4 cordel-border">
          <p className="text-xs text-[var(--cordel-text)]/80 leading-relaxed font-cactus">
            {t.instructions}
          </p>
          <button
            onClick={startRound}
            className="px-6 py-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus text-sm font-bold uppercase cordel-border hover:opacity-90 active:translate-y-0.5 cursor-pointer"
          >
            {t.startBtn}
          </button>
        </div>
      )}

      {isRoundStarted && (
        <>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest text-[var(--cordel-text)]/60 font-bold">
              {t.hourglassLabel}
            </span>

            <div className="w-48 h-48 border-4 border-[var(--cordel-border)] bg-[var(--cordel-bg)] flex items-center justify-center relative shadow-[6px_6px_0_var(--cordel-border)] rounded-sm">
              <svg className="w-40 h-40 absolute" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="var(--cordel-border)"
                  strokeWidth="1.5"
                  strokeOpacity="0.15"
                />
                <circle
                  ref={circleRef}
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke={validationResult === 'success' ? '#16a34a' : validationResult === 'failure' ? 'var(--cordel-wood)' : 'var(--cordel-border)'}
                  strokeWidth="3.5"
                  strokeDasharray="201"
                  strokeDashoffset={0}
                  transform="rotate(-90 40 40)"
                  strokeLinecap="square"
                  style={{ willChange: 'stroke-dashoffset' }}
                />
              </svg>

              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-6xl filter drop-shadow-[2px_2px_0_var(--cordel-bg)] animate-pulse">
                  {activeRound.signSymbol}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[var(--cordel-text)]/70 mt-2 font-bold font-mono">
                  {activeRound.signName[lang]}
                </span>
              </div>

              {selectedOption && validationResult === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none select-none z-20">
                  <div className="border-3 border-dashed border-[var(--cordel-wood)] text-[var(--cordel-wood)] font-cactus font-black text-xs px-3 py-1.5 uppercase tracking-widest rotate-[-12deg] bg-[var(--cordel-bg)]/90 shadow-md">
                    {t.selectedStamp} <br />
                    <span className="text-[10px] text-[var(--cordel-text)]">{selectedOption}</span>
                  </div>
                </div>
              )}

              {validationResult === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-600/10 pointer-events-none select-none z-20">
                  <div className="border-4 border-dashed border-green-600 text-green-600 font-cactus font-black text-base px-4 py-2 uppercase tracking-widest rotate-[-15deg] bg-[var(--cordel-bg)] shadow-xl animate-bounce">
                    {t.solvedSuccess}
                  </div>
                </div>
              )}

              {validationResult === 'failure' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-600/10 pointer-events-none select-none z-20">
                  <div className="border-4 border-dashed border-[var(--cordel-wood)] text-[var(--cordel-wood)] font-cactus font-black text-sm px-3 py-1.5 uppercase tracking-widest rotate-[10deg] bg-[var(--cordel-bg)] shadow-xl">
                    {t.solvedFailure}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {activeRound.options[lang].map((option, idx) => {
              const isSelected = selectedOption === option;
              
              return (
                <button
                  key={idx}
                  disabled={validationResult !== null || !isTimerRunning}
                  onClick={() => handleOptionSelect(option)}
                  className={`w-full p-4 border-3 text-left font-cactus text-sm font-bold transition-all duration-150 flex items-center gap-3 relative ${
                    isSelected
                      ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] translate-x-[2px] translate-y-[2px] shadow-none'
                      : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cordel-border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="text-xs px-2 py-0.5 border border-current rounded-sm">
                    {t.optionLabel} {idx + 1}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {validationResult === 'success' && (
            <div className="p-4 border-3 border-green-600 bg-green-500/10 text-green-700 text-center flex flex-col items-center justify-center relative rotate-[-1deg] mt-2">
              <div className="flex items-center gap-2 z-10">
                <Check className="w-5 h-5 text-green-600 shrink-0" />
                <span className="font-cactus font-bold text-xs">
                  {t.successMsg}
                </span>
              </div>
            </div>
          )}

          {validationResult === 'failure' && (
            <div className="p-4 border-3 border-react border-[var(--cordel-wood)] bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)] text-center flex flex-col items-center justify-center relative rotate-[1deg] mt-2">
              <div className="flex items-center gap-2 z-10">
                <X className="w-5 h-5 text-[var(--cordel-wood)] shrink-0" />
                <span className="font-cactus font-bold text-xs font-cactus">
                  {t.failureMsg}
                </span>
              </div>
            </div>
          )}

          {validationResult !== null && (
            <button
              onClick={handleNextRound}
              className="w-full py-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus text-sm font-bold uppercase cordel-border flex items-center justify-center gap-2 hover:opacity-95 active:translate-y-0.5 mt-4 cursor-pointer"
            >
              {t.btnNext} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
