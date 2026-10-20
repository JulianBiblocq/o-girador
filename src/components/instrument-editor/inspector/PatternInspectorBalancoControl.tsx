/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BalancoPresetItem } from './inspectorTypes';

export interface PatternInspectorBalancoControlProps {
  activePattern: any;
  trackId: number;
  isFr: boolean;
  isVoice: boolean;
  balancoPresets?: BalancoPresetItem[];
  currentBalancoAmount: number;
  onBalancoChange?: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
}

export const PatternInspectorBalancoControl: React.FC<PatternInspectorBalancoControlProps> = React.memo(({
  activePattern, trackId, isFr, isVoice, balancoPresets = [], currentBalancoAmount, onBalancoChange,
}) => {
  const content = (
    <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-[#1a1a1a]/15 w-full min-w-0 box-border">
      <select
        value={activePattern.balancoPresetId || ''}
        onChange={(e) => {
          const val = e.target.value || undefined;
          onBalancoChange?.(trackId, activePattern.id, val, currentBalancoAmount);
        }}
        style={{ colorScheme: 'light' }}
        className="flex-1 min-w-0 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] px-1 py-0.5 text-[10px] font-bold rounded shadow-[1px_1px_0px_#1a1a1a] outline-none cursor-pointer truncate"
        title={isFr ? "Héritage du preset de balanço" : "Herança do preset de balanço"}
      >
        <option value="">{isFr ? "Hériter de l'instrument" : 'Herdar do instrumento'}</option>
        {balancoPresets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <input
        type="range"
        min="0"
        max="100"
        value={currentBalancoAmount}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onBalancoChange?.(trackId, activePattern.id, activePattern.balancoPresetId, val);
        }}
        className="w-16 h-1.5 bg-[#1a1a1a]/20 rounded-full appearance-none cursor-pointer outline-none accent-[#8b2a1a] shrink-0"
        title={isFr ? "Dosage local du balanço pour ce motif" : "Dosagem local do balanço para este padrão"}
      />
    </div>
  );

  if (isVoice) {
    return (
      <details className="group bg-[#f4ecd8]/60 p-1.5 border border-[#1a1a1a]/30 rounded shadow-xs select-none w-full min-w-0 box-border">
        <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between text-[#1a1a1a]/70 hover:text-[#1a1a1a] select-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1 min-w-0 truncate">
            <span>⚖️</span>
            <span className="truncate">Balanço / Swing</span>
            <span className="font-mono text-[#8b2a1a] shrink-0">({currentBalancoAmount}%)</span>
          </span>
          <span className="text-[9px] transition-transform group-open:rotate-90 shrink-0 ml-1">▸</span>
        </summary>
        {content}
      </details>
    );
  }

  return (
    <div className="flex flex-col gap-1 bg-[#f4ecd8]/60 p-2 border border-[#1a1a1a]/30 rounded shadow-xs select-none w-full min-w-0 box-border">
      <div className="flex items-center justify-between text-[10px] font-bold text-[#1a1a1a] w-full min-w-0">
        <span className="flex items-center gap-1 min-w-0 truncate"><span>⚖️</span><span className="truncate">Balanço / Swing</span></span>
        <span className="font-mono text-[10px] text-[#8b2a1a] font-bold shrink-0 ml-1">{currentBalancoAmount}%</span>
      </div>
      {content}
    </div>
  );
});

PatternInspectorBalancoControl.displayName = 'PatternInspectorBalancoControl';
