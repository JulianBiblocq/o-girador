import React from 'react';
import { Scissors, Delete } from 'lucide-react';
import { StrokeColumnSliders } from './StrokeColumnSliders';

export interface StrokeToolInspectorProps {
  isEraser: boolean;
  isScissors: boolean;
  isFr: boolean;
  activeTool: string;
  currentPair: any;
  allPairs?: any[];
  isExpandedLayout?: boolean;
  onSelectTool?: (tool: string) => void;
  instrument: any;
  trackId: number;
  trackLabel?: string;
  patternId?: number;
  patternLabel?: string;
  isVoice: boolean;
  getStrokeStats: (stroke: string) => { avgVolume: number; avgDecay: number };
  playThrottledPreview: (symbol: string, volumePct: number, decayPct: number) => void;
  applyMacroVolumeDelta: (stroke: string, delta: number, targetVal: number) => void;
  applyMacroDecayDelta: (stroke: string, delta: number, targetVal: number) => void;
}

export const StrokeToolInspector: React.FC<StrokeToolInspectorProps> = React.memo((props) => {
  const {
    isEraser, isScissors, isFr, activeTool, currentPair, allPairs = [], isExpandedLayout = false,
    onSelectTool, instrument, trackId, trackLabel, patternId, patternLabel,
    isVoice, getStrokeStats, playThrottledPreview, applyMacroVolumeDelta, applyMacroDecayDelta,
  } = props;

  if (isEraser && !isExpandedLayout) {
    return (
      <div className="bg-[var(--cordel-parchment-bg)] cordel-border-sm p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[var(--cordel-ink-dark)] shadow-sm">
        <div className="w-9 h-9 rounded-sm bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_var(--cordel-ink-dark)]"><Delete size={18} /></div>
        <span className="font-cactus font-bold text-xs">{isFr ? "Outil d'effacement actif" : 'Ferramenta de apagar ativa'}</span>
        <p className="text-[10px] text-[var(--cordel-text-muted)] leading-tight max-w-[200px]">
          {isFr ? 'Cliquez ou glissez sur les pas de la grille pour supprimer des frappes.' : 'Clique ou arraste nos passos da grade para remover toques.'}
        </p>
      </div>
    );
  }

  if (isScissors && !isExpandedLayout) {
    return (
      <div className="bg-[var(--cordel-parchment-bg)] cordel-border-sm p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[var(--cordel-ink-dark)] shadow-sm">
        <div className="w-9 h-9 rounded-sm bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_var(--cordel-ink-dark)]"><Scissors size={18} /></div>
        <span className="font-cactus font-bold text-xs">{isFr ? 'Outil Ciseau / Colle actif' : 'Ferramenta Tesoura / Cola ativa'}</span>
        <p className="text-[10px] text-[var(--cordel-text-muted)] leading-tight max-w-[220px]">
          {isFr ? 'Cliquez sur un pas simple pour le scinder en deux triples croches. Cliquez sur un pas scindé pour le recoller.' : 'Clique num passo para dividir em duas semicolcheias. Clique num passo dividido para colar.'}
        </p>
      </div>
    );
  }

  const defaultSymbol = ['gongue', 'timbal'].includes(instrument?.id) ? 'G' : instrument?.id === 'mineiro' ? 'P' : instrument?.id === 'apito' ? 'W' : 'D';
  const cleanActive = (activeTool === 'O' || activeTool === '0' || !activeTool) ? defaultSymbol : activeTool;
  const activeStrongSym = currentPair ? currentPair.strong.symbol : cleanActive.toUpperCase();

  const renderCol = (strokeObj: any, isWeak: boolean) => (
    <StrokeColumnSliders
      key={strokeObj.symbol} symbol={strokeObj.symbol} shortcut={strokeObj.shortcut} label={strokeObj.label} isWeak={isWeak}
      instrument={instrument} trackId={trackId} trackLabel={trackLabel} patternId={patternId} patternLabel={patternLabel}
      activeTool={activeTool} isVoice={isVoice} isFr={isFr}
      stats={getStrokeStats(strokeObj.symbol)} playThrottledPreview={playThrottledPreview}
      applyMacroVolumeDelta={applyMacroVolumeDelta} applyMacroDecayDelta={applyMacroDecayDelta}
    />
  );

  const renderPairBlock = (pair: any, highlightActive: boolean) => {
    const strokes = pair?.strokes || [{ symbol: activeStrongSym, label: activeStrongSym }];
    const chain = strokes.map((s: any) => s.symbol).join(' / ');
    return (
      <div key={pair?.id || chain} className="flex flex-col gap-1.5 w-full min-w-0 box-border">
        <div
          onClick={pair?.strong?.symbol && onSelectTool ? () => onSelectTool(pair.strong.symbol) : undefined}
          className={`flex items-center justify-between gap-2 cordel-border-sm px-2.5 py-1 shrink-0 w-full min-w-0 box-border ${onSelectTool ? 'cursor-pointer transition-colors' : ''} ${highlightActive ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/5'}`}
        >
          <span className="font-cactus font-bold text-xs truncate">{pair?.mainLabel || cleanActive}</span>
          <span className={`text-[10px] font-mono font-bold shrink-0 ${highlightActive ? 'text-[var(--cordel-on-accent)]' : 'text-[var(--cordel-accent-readable)]'}`}>{chain}</span>
        </div>
        {strokes.length === 1 ? (
          <div className="flex flex-col gap-2 w-full min-w-0 box-border">{renderCol(strokes[0], false)}</div>
        ) : strokes.length === 2 ? (
          <div className="flex flex-row gap-2 w-full min-w-0 box-border">{renderCol(strokes[0], false)}{renderCol(strokes[1], true)}</div>
        ) : strokes.length === 3 ? (
          <div className="flex flex-col gap-2 w-full min-w-0 box-border">
            <div className="flex flex-row gap-2 w-full min-w-0 box-border">{renderCol(strokes[0], false)}{renderCol(strokes[1], true)}</div>
            <div className="flex flex-row gap-2 w-full min-w-0 box-border">{renderCol(strokes[2], true)}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full min-w-0 box-border">
            <div className="flex flex-row gap-2 w-full min-w-0 box-border">{renderCol(strokes[0], false)}{renderCol(strokes[1], true)}</div>
            <div className="flex flex-row gap-2 w-full min-w-0 box-border">{renderCol(strokes[2], false)}{renderCol(strokes[3], true)}</div>
          </div>
        )}
      </div>
    );
  };

  if (isExpandedLayout && allPairs.length > 1) {
    return (
      <div className="flex flex-col gap-3 w-full min-w-0 box-border">
        {allPairs.map((pair) => renderPairBlock(pair, Boolean(currentPair && currentPair.id === pair.id && !isEraser && !isScissors)))}
      </div>
    );
  }

  return <div className="flex flex-col gap-2 w-full min-w-0 box-border">{renderPairBlock(currentPair, false)}</div>;
});

StrokeToolInspector.displayName = 'StrokeToolInspector';
