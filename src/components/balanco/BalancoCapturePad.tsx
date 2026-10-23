import React from 'react';
import { Language } from '../../types';

interface BalancoCapturePadProps {
  phase: 'idle' | 'preroll' | 'recording' | 'done';
  prerollCount: number;
  hitCount: number;
  lang: Language;
  padRef: React.RefObject<HTMLButtonElement | null>;
  onPointerHit: (e: React.PointerEvent) => void;
  onStartCapture: () => void;
}

export const BalancoCapturePad: React.FC<BalancoCapturePadProps> = ({
  phase,
  prerollCount,
  hitCount,
  lang,
  padRef,
  onPointerHit,
  onStartCapture,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      {phase === 'preroll' && (
        <div className="w-full h-36 flex flex-col items-center justify-center bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black shadow-[4px_4px_0px_#000] rounded-sm animate-pulse">
          <span className="text-xs uppercase font-bold tracking-wider">
            {lang === 'fr' ? 'Écoutez le pré-roll...' : 'Ouça o pré-roll...'}
          </span>
          <span className="font-cactus text-6xl font-black">{prerollCount}</span>
        </div>
      )}

      {phase === 'recording' && (
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8b2a1a]">
            <span className="w-3 h-3 rounded-full bg-[#8b2a1a] animate-ping" />
            <span className="uppercase">
              {lang === 'fr' ? 'Enregistrement en cours...' : 'Gravando...'} ({hitCount}{' '}
              {lang === 'fr' ? 'frappes' : 'toques'})
            </span>
          </div>

          <button
            ref={padRef}
            type="button"
            onPointerDown={onPointerHit}
            className="w-full h-36 bg-[#f4ecd8] border-[3px] border-[#1a1a1a] shadow-[4px_4px_0px_#000] rounded-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform duration-75 select-none"
          >
            <span className="text-3xl mb-1"></span>
            <span className="font-cactus text-xl font-bold">
              {lang === 'fr' ? 'FRAPPEZ ICI' : 'TOQUE AQUI'}
            </span>
            <span className="text-[10px] opacity-75 mt-1 font-mono">
              {lang === 'fr' ? 'Touches [F] / [J] ou Pad MIDI' : 'Teclas [F] / [J] ou Pad MIDI'}
            </span>
          </button>
        </div>
      )}

      {phase === 'idle' && (
        <div className="w-full flex flex-col items-center gap-4 py-2">
          <p className="text-xs text-center opacity-90">
            {lang === 'fr'
              ? 'Jouez votre balanço en rythme au métronome. Le système calculera automatiquement la médiane des retards et avances sur les 4 doubles-croches.'
              : 'Toque seu balanço no tempo do metrônomo. O sistema calculará automaticamente a mediana dos atrasos e avanços nas 4 semicolcheias.'}
          </p>

          <button
            type="button"
            onClick={onStartCapture}
            className="w-full py-3 bg-[#8b2a1a] text-[#f4ecd8] font-cactus text-lg font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            ▶{lang === 'fr' ? "Démarrer l'enregistrement" : 'Iniciar Gravação'}
          </button>
        </div>
      )}
    </div>
  );
};
