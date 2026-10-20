/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scissors, MoveHorizontal, RotateCcw } from 'lucide-react';

export interface AudioAlignmentControlsProps {
  lang: string;
  trimStartSec: number;
  setTrimStartSec: (sec: number) => void;
  trimEndSec: number;
  setTrimEndSec: (sec: number) => void;
  bufferDuration: number;
  initialNudgeMs: number;
  nudgeValueLabelRef: React.RefObject<HTMLSpanElement | null>;
  handleResetNudge: () => void;
  handleNudgeInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AudioAlignmentControls: React.FC<AudioAlignmentControlsProps> = React.memo(({
  lang, trimStartSec, setTrimStartSec, trimEndSec, setTrimEndSec,
  bufferDuration, initialNudgeMs, nudgeValueLabelRef, handleResetNudge, handleNudgeInput,
}) => {
  return (
    <>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between text-xs font-bold text-[#1a1a1a]">
          <span className="flex items-center gap-1.5 uppercase text-[#2a5d4e]">
            <Scissors className="w-4 h-4 text-[#2a5d4e]" />
            {lang === 'fr' ? 'Rognage Audio (Trim Start / Trim End)' : 'Ajuste de Trim (Trim Início / Trim Fim)'}
          </span>
          <span className="text-[10px] text-[#1a1a1a]/60">
            {lang === 'fr' ? "L'anacrouse respire à gauche de la ligne rouge Temps 1." : 'A anacruse respira à esquerda da linha vermelha Tempo 1.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#2a5d4e]">{lang === 'fr' ? 'Trim Début :' : 'Trim Início :'}</span>
              <span className="font-mono text-[#2a5d4e]">{trimStartSec.toFixed(3)}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, trimEndSec - 0.05)}
              step="0.005"
              value={trimStartSec}
              onChange={(e) => setTrimStartSec(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#2a5d4e]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#8b2a1a]">{lang === 'fr' ? 'Trim Fin :' : 'Trim Fim :'}</span>
              <span className="font-mono text-[#8b2a1a]">
                {trimEndSec.toFixed(3)}s / {bufferDuration.toFixed(3)}s
              </span>
            </div>
            <input
              type="range"
              min={trimStartSec + 0.05}
              max={bufferDuration}
              step="0.005"
              value={trimEndSec}
              onChange={(e) => setTrimEndSec(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-4 rounded-sm flex flex-col gap-3 shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#8b2a1a] uppercase flex items-center gap-1.5">
              <MoveHorizontal className="w-4 h-4 text-[#8b2a1a]" />
              {lang === 'fr' ? 'Calage Fin de Latence (Nudge -300ms à +300ms) & Déplacement' : 'Ajuste Fino de Latência (Nudge -300ms a +300ms) & Deslocamento'}
            </span>
            <span className="text-[10px] text-[#1a1a1a]/60">
              {lang === 'fr' ? "Glissez directement l'onde sur le visualiseur ou affinez au millième de seconde avec le curseur." : 'Arraste diretamente a onda no visualizador ou ajuste ao milésimo de segundo com o cursor.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              ref={nudgeValueLabelRef}
              className="text-base font-black px-3 py-0.5 bg-[#ece4d0] border-2 border-[#1a1a1a] rounded-sm text-[#1a1a1a]"
            >
              {initialNudgeMs > 0 ? `+${initialNudgeMs}` : initialNudgeMs} ms
            </span>
            <button
              onClick={handleResetNudge}
              className="p-1.5 bg-[#ece4d0] hover:bg-[#8b2a1a] hover:text-[#fdfaf2] border-2 border-[#1a1a1a] transition-colors rounded-sm cursor-pointer"
              title={lang === 'fr' ? 'Réinitialiser le Nudge à 0 ms' : 'Redefinir Nudge para 0 ms'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <input
          id="vocal-nudge-slider"
          type="range"
          min="-300"
          max="300"
          step="1"
          defaultValue={initialNudgeMs}
          onChange={handleNudgeInput}
          className="w-full h-2.5 bg-[#ece4d0] rounded border border-[#1a1a1a] appearance-none cursor-pointer accent-[#8b2a1a]"
        />
      </div>
    </>
  );
});

AudioAlignmentControls.displayName = 'AudioAlignmentControls';
