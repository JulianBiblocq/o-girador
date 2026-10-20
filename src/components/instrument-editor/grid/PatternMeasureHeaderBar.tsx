/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencer } from '../../../contexts/SequencerContext';

interface PatternMeasureHeaderBarProps {
  steps: number;
  patternId: number;
  trackId: number;
  lang: string;
  onStepsChange: (trackId: number, patternId: number, newSteps: number) => void;
}

export const PatternMeasureHeaderBar: React.FC<PatternMeasureHeaderBarProps> = ({
  steps,
  patternId,
  trackId,
  lang,
  onStepsChange,
}) => {
  const { confirmAsync } = useSequencer();

  const handleAllonger = async () => {
    let nextSteps = 16;
    if (steps === 16) nextSteps = 32;
    else if (steps === 32) nextSteps = 48;
    else if (steps === 48) nextSteps = 64;
    else nextSteps = 16;

    if (nextSteps < steps) {
      const confirmMsg =
        lang === 'fr'
          ? 'Réduire la taille du motif va tronquer les notes de la fin. Continuer ?'
          : 'Reduzir o tamanho do padrão cortará as notas no final. Continuar?';
      const confirmed = await confirmAsync(confirmMsg);
      if (!confirmed) return;
    }
    onStepsChange(trackId, patternId, nextSteps);
  };

  const measureCount = Math.ceil(steps / 16);
  const nextMeasureLabel =
    steps === 16
      ? '2 mes.'
      : steps === 32
      ? '3 mes.'
      : steps === 48
      ? '4 mes.'
      : '1 mes.';
  const nextCompLabel =
    steps === 16
      ? '2 comp.'
      : steps === 32
      ? '3 comp.'
      : steps === 48
      ? '4 comp.'
      : '1 comp.';

  return (
    <div className="flex justify-between items-center mb-1 mt-3 px-1 select-none">
      <div className="text-[11px] font-bold text-[#1a1a1a]/60 tracking-wide uppercase">
        {lang === 'fr' ? 'Mesure principale' : 'Compasso principal'} ({measureCount}{' '}
        {lang === 'fr' ? 'Mesure(s)' : 'Compasso(s)'})
      </div>
      <button
        onClick={handleAllonger}
        className="px-2.5 py-1 bg-[#8b2a1a]/10 hover:bg-[#8b2a1a]/20 text-[#8b2a1a] border border-[#8b2a1a]/30 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
      >
        <span>➕</span>
        <span>
          {lang === 'fr'
            ? `Allonger le motif (${nextMeasureLabel})`
            : `Alongar padrão (${nextCompLabel})`}
        </span>
      </button>
    </div>
  );
};
