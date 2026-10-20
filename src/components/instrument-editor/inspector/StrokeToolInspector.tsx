/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scissors } from 'lucide-react';
import { StrokeColumnSliders } from './StrokeColumnSliders';

export interface StrokeToolInspectorProps {
  isEraser: boolean;
  isScissors: boolean;
  isFr: boolean;
  activeTool: string;
  currentPair: any;
  instrument: any;
  trackId: number;
  isVoice: boolean;
  getStrokeStats: (stroke: string) => { avgVolume: number; avgDecay: number };
  playThrottledPreview: (symbol: string, volumePct: number, decayPct: number) => void;
  applyMacroVolumeDelta: (stroke: string, delta: number, targetVal: number) => void;
  applyMacroDecayDelta: (stroke: string, delta: number, targetVal: number) => void;
}

export const StrokeToolInspector: React.FC<StrokeToolInspectorProps> = React.memo((props) => {
  const {
    isEraser, isScissors, isFr, activeTool, currentPair, instrument, trackId,
    isVoice, getStrokeStats, playThrottledPreview, applyMacroVolumeDelta, applyMacroDecayDelta,
  } = props;

  if (isEraser) {
    return (
      <div className="bg-[#f4ecd8] cordel-border-sm p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[#1a1a1a] shadow-sm">
        <div className="w-9 h-9 rounded-sm bg-[#8b2a1a] text-[#f4ecd8] flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#1a1a1a]">⌫</div>
        <span className="font-cactus font-bold text-xs">{isFr ? "Outil d'effacement actif" : 'Ferramenta de apagar ativa'}</span>
        <p className="text-[10px] text-[#666] leading-tight max-w-[200px]">
          {isFr ? 'Cliquez ou glissez sur les pas de la grille pour supprimer des frappes.' : 'Clique ou arraste nos passos da grade para remover toques.'}
        </p>
      </div>
    );
  }

  if (isScissors) {
    return (
      <div className="bg-[#f4ecd8] cordel-border-sm p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[#1a1a1a] shadow-sm">
        <div className="w-9 h-9 rounded-sm bg-[#8b2a1a] text-[#f4ecd8] flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#1a1a1a]"><Scissors size={18} /></div>
        <span className="font-cactus font-bold text-xs">{isFr ? 'Outil Ciseau / Colle actif' : 'Ferramenta Tesoura / Cola ativa'}</span>
        <p className="text-[10px] text-[#666] leading-tight max-w-[220px]">
          {isFr ? 'Cliquez sur un pas simple pour le scinder en deux triples croches. Cliquez sur un pas scindé pour le recoller.' : 'Clique num passo para dividir em duas semicolcheias. Clique num passo dividido para colar.'}
        </p>
      </div>
    );
  }

  const activeStrongSym = currentPair ? currentPair.strong.symbol : (activeTool || '').toUpperCase();
  const strokeChain = currentPair ? currentPair.strokes.map((s: any) => s.symbol).join(' / ') : activeTool;

  const renderCol = (strokeObj: any, isWeak: boolean) => (
    <StrokeColumnSliders
      key={strokeObj.symbol} symbol={strokeObj.symbol} label={strokeObj.label} isWeak={isWeak}
      instrument={instrument} trackId={trackId} isVoice={isVoice} isFr={isFr}
      stats={getStrokeStats(strokeObj.symbol)} playThrottledPreview={playThrottledPreview}
      applyMacroVolumeDelta={applyMacroVolumeDelta} applyMacroDecayDelta={applyMacroDecayDelta}
    />
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 bg-[#f4ecd8] cordel-border-sm px-2.5 py-1 shrink-0">
        <span className="font-cactus font-bold text-xs text-[#1a1a1a] truncate">{currentPair?.mainLabel || activeTool}</span>
        <span className="text-[10px] text-[#8b2a1a] font-mono font-bold">{strokeChain}</span>
      </div>

      {currentPair?.strokes && currentPair.strokes.length === 1 ? (
        <div className="flex flex-col gap-2">{renderCol(currentPair.strokes[0], false)}</div>
      ) : currentPair?.strokes && currentPair.strokes.length === 2 ? (
        <div className="flex flex-row gap-2">{renderCol(currentPair.strokes[0], false)}{renderCol(currentPair.strokes[1], true)}</div>
      ) : currentPair?.strokes && currentPair.strokes.length === 3 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">{renderCol(currentPair.strokes[0], false)}{renderCol(currentPair.strokes[1], true)}</div>
          <div className="flex flex-row gap-2">{renderCol(currentPair.strokes[2], true)}</div>
        </div>
      ) : currentPair?.strokes && currentPair.strokes.length >= 4 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">{renderCol(currentPair.strokes[0], false)}{renderCol(currentPair.strokes[1], true)}</div>
          <div className="flex flex-row gap-2">{renderCol(currentPair.strokes[2], false)}{renderCol(currentPair.strokes[3], true)}</div>
        </div>
      ) : (
        <div className="flex flex-row gap-2">{renderCol({ symbol: activeStrongSym, label: activeStrongSym }, false)}</div>
      )}
    </div>
  );
});

StrokeToolInspector.displayName = 'StrokeToolInspector';
