/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern } from '../../../types';

interface VoicePatternGridTupletBarProps {
  pattern: Pattern;
  lang: string;
  isCurrentAll12: boolean;
  isCurrentAll16: boolean;
  onSetAllBeatsResolution?: (patternId: number, newResolution: number) => void;
}

export const VoicePatternGridTupletBar: React.FC<VoicePatternGridTupletBarProps> = React.memo(({
  pattern, lang, isCurrentAll12, isCurrentAll16, onSetAllBeatsResolution,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 px-2.5 py-1.5 bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-md shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-[#1a1a1a]">⚙️ {lang === 'fr' ? 'Divisions vocales :' : 'Divisões vocais :'}</span>
        <span className="text-[10px] text-[#1a1a1a]/60">({lang === 'fr' ? 'Par temps ou global' : 'Por tempo ou global'})</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSetAllBeatsResolution?.(pattern.id, 3)}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-colors ${
            isCurrentAll12 ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a] shadow-xs' : 'bg-[#ece4d0]/80 text-[#1a1a1a] border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/10'
          }`}
          title={lang === 'fr' ? 'Passer toute la mesure en triolets (12 pas)' : 'Passar todo o compasso em tercinas (12 passos)'}
        >
          3 {lang === 'fr' ? 'Triolets (12 pas)' : 'Tercinas (12 passos)'}
        </button>
        <button
          onClick={() => onSetAllBeatsResolution?.(pattern.id, 4)}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-colors ${
            isCurrentAll16 ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] shadow-xs' : 'bg-[#ece4d0]/80 text-[#1a1a1a] border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/10'
          }`}
          title={lang === 'fr' ? 'Passer toute la mesure en doubles-croches (16 pas standard)' : 'Passar todo o compasso em semicolcheias (16 passos padrão)'}
        >
          4 {lang === 'fr' ? 'D.Croches (16 pas)' : 'Semicolcheias (16)'}
        </button>
      </div>
    </div>
  );
});

VoicePatternGridTupletBar.displayName = 'VoicePatternGridTupletBar';
