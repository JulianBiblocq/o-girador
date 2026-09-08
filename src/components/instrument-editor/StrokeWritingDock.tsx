/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { isDarkText } from '../../data';
import { getStrokePairs } from '../../utils/instrumentStrokes';
import { Sliders, ArrowLeftRight, Scissors } from 'lucide-react';

const NO_ALTERNATION_INSTRUMENTS = new Set(['marcante', 'meiao', 'repique', 'alfaia', 'gongue', 'apito', 'puxador', 'coro', 'toada']);

interface StrokeWritingDockProps {
  trackId: number;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    name?: string;
    [key: string]: any;
  };
  lang: string;
  isLeftHanded: boolean;
  activeTool: string; // e.g. 'D', 'E', '0', 'scissors', etc.
  onSelectTool: (tool: string) => void;
  isAlternating?: boolean;
  onToggleAlternating?: () => void;
  onOpenBottomSheet?: () => void;
  showInspectorButton?: boolean;
}

export const StrokeWritingDock: React.FC<StrokeWritingDockProps> = React.memo(({
  instrument,
  lang,
  isLeftHanded,
  activeTool,
  onSelectTool,
  isAlternating = false,
  onToggleAlternating,
  onOpenBottomSheet,
  showInspectorButton = true,
}) => {
  const isFr = lang === 'fr';

  const pairs = useMemo(() => {
    return getStrokePairs(instrument.id, instrument.type, lang, isLeftHanded);
  }, [instrument.id, instrument.type, lang, isLeftHanded]);

  const isEraserActive = activeTool === '0' || activeTool === 0 || activeTool === '';
  const isScissorsActive = activeTool === 'scissors';
  const supportsAlternation = !NO_ALTERNATION_INSTRUMENTS.has(instrument.id) && !NO_ALTERNATION_INSTRUMENTS.has(instrument.type);

  return (
    <div className="w-full bg-[#f4ede2] border-t-[3px] border-[#1a1a1a] px-3 py-2 shrink-0 flex items-center justify-between gap-2.5 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] z-30 select-none">
      {/* Tools list aligned directly to the left */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pl-2 pr-3 py-1.5 min-w-0 flex-1 scrollbar-none">
        {/* Main Stroke Tool Pairs / Groups */}
        {pairs.map((pair) => {
          const isSelected = !isScissorsActive && !isEraserActive && (
            pair.id === activeTool ||
            pair.strong.symbol === activeTool ||
            pair.strokes.some(s => s.symbol === activeTool)
          );
          const bgCol = instrument.colors?.[pair.strong.colorKey] || '#666';
          const isDark = isDarkText(instrument.id, pair.strong.colorKey);
          const txtCol = isDark ? '#1a1a1a' : '#f4ecd8';

          const strokeChain = pair.strokes.map(s => s.symbol).join(' / ');

          return (
            <button
              key={pair.id}
              type="button"
              onClick={() => onSelectTool(pair.strong.symbol)}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
                isSelected
                  ? 'border-[#8b2a1a] bg-[#f4ecd8] shadow-[2px_2px_0px_#8b2a1a] scale-105 z-10'
                  : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
              }`}
              title={`${pair.mainLabel} (${strokeChain}) — ${isFr ? 'Raccourci' : 'Tecla'}: ${pair.strong.shortcut}`}
            >
              {/* Stroke visual icon badge */}
              <div
                className="w-7 h-7 rounded-sm flex items-center justify-center font-bold text-xs shadow-inner"
                style={{ backgroundColor: bgCol, color: txtCol }}
              >
                {pair.strong.symbol}
              </div>

              {/* Label and shortcut */}
              <div className="flex flex-col items-start leading-tight min-w-0">
                <span className={`text-[11px] font-cactus font-bold truncate max-w-[80px] sm:max-w-[105px] ${
                  isSelected ? 'text-[#8b2a1a]' : 'text-[#1a1a1a]'
                }`}>
                  {pair.mainLabel}
                </span>
                <span className="text-[9px] text-[#666] font-mono">
                  {strokeChain} [{pair.strong.shortcut}]
                </span>
              </div>
            </button>
          );
        })}

        {/* Separator */}
        <div className="h-6 w-[1px] bg-[#1a1a1a]/20 shrink-0 mx-0.5" />

        {/* Mode Alternance Toggle Button (Frisé) - Uniquement pour Caixas, Tarols, Timbals, Mineiro, Agbê */}
        {supportsAlternation && onToggleAlternating && (
          <button
            type="button"
            onClick={onToggleAlternating}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
              isAlternating
                ? 'border-[#8b2a1a] bg-[#8b2a1a] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]'
                : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]'
            }`}
            title={
              isFr
                ? 'Mode Alternance (Frisé) : Pas 1,3,5... Coup Fort | Pas 2,4,6... Coup Faible'
                : 'Modo Alternância : Passo 1,3,5... Toque Forte | Passo 2,4,6... Toque Fraco'
            }
          >
            <ArrowLeftRight size={14} className={isAlternating ? 'text-[#f4ecd8]' : 'text-[#8b2a1a]'} />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-cactus font-bold">
                {isFr ? 'Alternance' : 'Alternância'}
              </span>
              <span className={`text-[9px] font-mono ${isAlternating ? 'text-[#f4ecd8]/90' : 'text-[#666]'}`}>
                {isAlternating ? (isFr ? 'ACTIF ⇄' : 'ATIVO ⇄') : (isFr ? 'Désactivé' : 'Inativo')}
              </span>
            </div>
          </button>
        )}

        {/* Gomme / Eraser Tool */}
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
            <span className={`text-[11px] font-cactus font-bold ${isEraserActive ? 'text-[#f4ecd8]' : 'text-[#1a1a1a]'}`}>
              {isFr ? 'Gomme' : 'Borracha'}
            </span>
            <span className={`text-[9px] font-mono ${isEraserActive ? 'text-[#f4ecd8]/80' : 'text-[#666]'}`}>
              [0 / Del]
            </span>
          </div>
        </button>

        {/* Outil Ciseau / Colle (Scissors / Glue) */}
        <button
          type="button"
          onClick={() => onSelectTool('scissors')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
            isScissorsActive
              ? 'border-[#8b2a1a] bg-[#8b2a1a] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a] scale-105 z-10'
              : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]'
          }`}
          title={
            isFr
              ? '✂ / 🩹 Ciseau / Colle : Clic sur un pas simple pour le scinder en triples croches, ou sur un pas scindé pour le recoller'
              : '✂ / 🩹 Tesoura / Cola : Clique num passo para dividir em semicolcheias ou colar'
          }
        >
          <div className={`px-1.5 h-7 rounded-sm flex items-center justify-center gap-1 font-bold text-xs border border-[#1a1a1a]/20 ${
            isScissorsActive ? 'bg-[#f4ecd8] text-[#8b2a1a]' : 'bg-[#eaddcf] text-[#1a1a1a]'
          }`}>
            <Scissors size={14} />
            <span className="text-[10px] opacity-70">/</span>
            <span className="text-xs">🩹</span>
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className={`text-[11px] font-cactus font-bold ${isScissorsActive ? 'text-[#f4ecd8]' : 'text-[#1a1a1a]'}`}>
              {isFr ? 'Ciseau / Colle' : 'Tesoura / Cola'}
            </span>
            <span className={`text-[9px] font-mono ${isScissorsActive ? 'text-[#f4ecd8]/80' : 'text-[#666]'}`}>
              [ ✂ / 🩹 ]
            </span>
          </div>
        </button>
      </div>

      {/* Right zone: Mobile / Tablet Inspector trigger button */}
      {showInspectorButton && onOpenBottomSheet && (
        <button
          type="button"
          onClick={onOpenBottomSheet}
          className="flex lg:hidden items-center gap-1.5 px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm font-cactus font-bold text-xs uppercase tracking-wide shrink-0 shadow-[2px_2px_0px_#1a1a1a] hover:bg-[#722215] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          title={isFr ? "Ouvrir l'inspecteur de frappe et accordage" : "Abrir inspetor de toque e afinação"}
        >
          <Sliders size={14} />
          <span className="hidden sm:inline">
            {isFr ? 'Inspecteur' : 'Inspetor'}
          </span>
          {!isEraserActive && !isScissorsActive && (
            <span className="px-1 py-0.2 bg-[#f4ecd8] text-[#8b2a1a] rounded-xs font-mono font-bold text-[10px]">
              {activeTool}
            </span>
          )}
        </button>
      )}
    </div>
  );
});

StrokeWritingDock.displayName = 'StrokeWritingDock';
