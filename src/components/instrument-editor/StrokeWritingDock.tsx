
import React, { useMemo } from 'react';
import { getStrokePairs } from '../../utils/instrumentStrokes';
import { Sliders } from 'lucide-react';
import { StrokeWritingDockPairButton } from './dock/StrokeWritingDockPairButton';
import { StrokeWritingDockSpecialTools } from './dock/StrokeWritingDockSpecialTools';

const NO_ALTERNATION_INSTRUMENTS = new Set(['marcante', 'meiao', 'repique', 'alfaia', 'gongue', 'apito', 'puxador', 'coro', 'toada']);

export interface StrokeWritingDockProps {
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
  activeTool: string;
  onSelectTool: (tool: string) => void;
  isAlternating?: boolean;
  onToggleAlternating?: () => void;
  onOpenBottomSheet?: () => void;
  showInspectorButton?: boolean;
}

export const StrokeWritingDock: React.FC<StrokeWritingDockProps> = React.memo(({
  trackId, instrument, lang, isLeftHanded, activeTool, onSelectTool,
  isAlternating = false, onToggleAlternating, onOpenBottomSheet, showInspectorButton = true,
}) => {
  const isFr = lang === 'fr';
  const pairs = useMemo(() => getStrokePairs(instrument.id, instrument.type, lang, isLeftHanded), [instrument.id, instrument.type, lang, isLeftHanded]);

  const isEraserActive = activeTool === '0' || activeTool === '';
  const isScissorsActive = activeTool === 'scissors';
  const supportsAlternation = !NO_ALTERNATION_INSTRUMENTS.has(instrument.id) && !NO_ALTERNATION_INSTRUMENTS.has(instrument.type);

  return (
    <div className="w-full bg-[#f4ede2] border-t-[3px] border-[#1a1a1a] px-3 py-2 shrink-0 flex items-center justify-between gap-2.5 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] z-30 select-none">
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pl-2 pr-3 py-1.5 min-w-0 flex-1 scrollbar-none">
        {pairs.map((pair) => (
          <StrokeWritingDockPairButton
            key={pair.id} trackId={trackId} pair={pair} instrument={instrument} activeTool={activeTool}
            isScissorsActive={isScissorsActive} isEraserActive={isEraserActive} isFr={isFr} onSelectTool={onSelectTool}
          />
        ))}

        <StrokeWritingDockSpecialTools
          supportsAlternation={supportsAlternation} isAlternating={isAlternating} onToggleAlternating={onToggleAlternating}
          isEraserActive={isEraserActive} isScissorsActive={isScissorsActive} isFr={isFr} onSelectTool={onSelectTool}
        />
      </div>

      {showInspectorButton && onOpenBottomSheet && (
        <button
          type="button"
          onClick={onOpenBottomSheet}
          className="flex lg:hidden items-center gap-1.5 px-3 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm font-cactus font-bold text-xs uppercase tracking-wide shrink-0 shadow-[2px_2px_0px_#1a1a1a] hover:bg-[#722215] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          title={isFr ? "Ouvrir l'inspecteur de frappe et accordage" : 'Abrir inspetor de toque e afinação'}
        >
          <Sliders size={14} />
          <span className="hidden sm:inline">{isFr ? 'Inspecteur' : 'Inspetor'}</span>
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
