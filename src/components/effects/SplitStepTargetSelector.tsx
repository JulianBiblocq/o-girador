/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SplitStepTargetSelectorProps {
  stepVal: [string, string];
  selectedSubIndex?: 0 | 1 | null;
  lang: string;
  onSelectSubIndex?: (subIndex: 0 | 1 | null) => void;
}

export const SplitStepTargetSelector: React.FC<SplitStepTargetSelectorProps> = ({
  stepVal,
  selectedSubIndex,
  lang,
  onSelectSubIndex,
}) => {
  return (
    <div className="flex items-center gap-1.5 py-1 px-2 bg-[#1a1a1a]/5 rounded-xs border border-[#1a1a1a]/15 text-[11px]">
      <span className="font-bold text-[#1a1a1a]/70 mr-1">
        {lang === 'fr' ? 'Cibler le coup :' : 'Alvo do golpe :'}
      </span>
      <button
        type="button"
        onClick={() => onSelectSubIndex?.(0)}
        className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer transition-colors ${
          selectedSubIndex === 0
            ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-xs'
            : 'bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 text-[#1a1a1a]'
        }`}
      >
        ⚡ {lang === 'fr' ? '1er Coup' : '1º Golpe'} ({stepVal[0]})
      </button>
      <button
        type="button"
        onClick={() => onSelectSubIndex?.(1)}
        className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer transition-colors ${
          selectedSubIndex === 1
            ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-xs'
            : 'bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 text-[#1a1a1a]'
        }`}
      >
        ⚡ {lang === 'fr' ? '2ème Coup' : '2º Golpe'} ({stepVal[1]})
      </button>
      <button
        type="button"
        onClick={() => onSelectSubIndex?.(null)}
        className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer transition-colors ${
          selectedSubIndex === null
            ? 'bg-[#8b2a1a] text-[#f4ecd8] shadow-xs'
            : 'bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 text-[#1a1a1a]'
        }`}
      >
        🔗 {lang === 'fr' ? 'Les deux (Lié)' : 'Ambos (Ligado)'}
      </button>
    </div>
  );
};
