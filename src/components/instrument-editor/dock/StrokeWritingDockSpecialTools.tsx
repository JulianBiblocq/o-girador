/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeftRight, Scissors } from 'lucide-react';

interface StrokeWritingDockSpecialToolsProps {
  supportsAlternation: boolean;
  isAlternating: boolean;
  onToggleAlternating?: () => void;
  isEraserActive: boolean;
  isScissorsActive: boolean;
  isFr: boolean;
  onSelectTool: (tool: string) => void;
}

export const StrokeWritingDockSpecialTools: React.FC<StrokeWritingDockSpecialToolsProps> = React.memo(({
  supportsAlternation, isAlternating, onToggleAlternating, isEraserActive, isScissorsActive, isFr, onSelectTool,
}) => {
  return (
    <>
      <div className="h-6 w-[1px] bg-[#1a1a1a]/20 shrink-0 mx-0.5" />

      {supportsAlternation && onToggleAlternating && (
        <button
          type="button"
          onClick={onToggleAlternating}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
            isAlternating
              ? 'border-[#8b2a1a] bg-[#8b2a1a] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]'
              : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]'
          }`}
          title={isFr ? 'Mode Alternance (Frisé) : Pas 1,3,5... Coup Fort | Pas 2,4,6... Coup Faible' : 'Modo Alternância : Passo 1,3,5... Toque Forte | Passo 2,4,6... Toque Fraco'}
        >
          <ArrowLeftRight size={14} className={isAlternating ? 'text-[#f4ecd8]' : 'text-[#8b2a1a]'} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[11px] font-cactus font-bold">{isFr ? 'Alternance' : 'Alternância'}</span>
            <span className={`text-[9px] font-mono ${isAlternating ? 'text-[#f4ecd8]/90' : 'text-[#666]'}`}>
              {isAlternating ? (isFr ? 'ACTIF ⇄' : 'ATIVO ⇄') : (isFr ? 'Désactivé' : 'Inativo')}
            </span>
          </div>
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelectTool('0')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
          isEraserActive
            ? 'border-[#8b2a1a] bg-[#8b2a1a] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a] scale-105 z-10'
            : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]'
        }`}
        title={isFr ? 'Gomme (Effacer) [0 / Del]' : 'Borracha (Apagar) [0 / Del]'}
      >
        <div className={`w-7 h-7 rounded-sm flex items-center justify-center font-bold text-sm border border-[#1a1a1a]/20 ${
          isEraserActive ? 'bg-[#f4ecd8] text-[#8b2a1a]' : 'bg-[#eaddcf] text-[#1a1a1a]'
        }`}>
          ⌫
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className={`text-[11px] font-cactus font-bold ${isEraserActive ? 'text-[#f4ecd8]' : 'text-[#1a1a1a]'}`}>{isFr ? 'Gomme' : 'Borracha'}</span>
          <span className={`text-[9px] font-mono ${isEraserActive ? 'text-[#f4ecd8]/80' : 'text-[#666]'}`}>[0 / Del]</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectTool(isScissorsActive ? 'D' : 'scissors')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
          isScissorsActive
            ? 'border-[#8b2a1a] bg-[#8b2a1a] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a] scale-105 z-10'
            : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]'
        }`}
        title={isFr ? '/ Ciseau / Colle : Clic sur un pas simple pour scinder, ou pas scindé pour recoller' : '/ Tesoura / Cola : Clique num passo para dividir ou colar'}
      >
        <div className={`px-1.5 h-7 rounded-sm flex items-center justify-center gap-1 font-bold text-xs border border-[#1a1a1a]/20 ${
          isScissorsActive ? 'bg-[#f4ecd8] text-[#8b2a1a]' : 'bg-[#eaddcf] text-[#1a1a1a]'
        }`}>
          <Scissors size={14} /><span className="text-[10px] opacity-70">/</span><span className="text-xs"></span>
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className={`text-[11px] font-cactus font-bold ${isScissorsActive ? 'text-[#f4ecd8]' : 'text-[#1a1a1a]'}`}>{isFr ? 'Ciseau / Colle' : 'Tesoura / Cola'}</span>
          <span className={`text-[9px] font-mono ${isScissorsActive ? 'text-[#f4ecd8]/80' : 'text-[#666]'}`}>[ / ]</span>
        </div>
      </button>
    </>
  );
});

StrokeWritingDockSpecialTools.displayName = 'StrokeWritingDockSpecialTools';
