/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';

export interface MetricDivisionSelectorProps {
  steps: number;
  patternId: number;
  lang: string;
  onChangeSteps: (patternId: number, steps: number) => void;
}

export const MetricDivisionSelector: React.FC<MetricDivisionSelectorProps> = React.memo(({
  steps,
  patternId,
  lang,
  onChangeSteps,
}) => {
  const isFr = lang === 'fr';

  const currentKey = useMemo(() => {
    if (steps === 16) return '16_straight';
    if (steps === 12) return '12_triplet';
    if (steps === 8) return '8_straight';
    if (steps === 24) return '24_sextuplet';
    return `${steps}_straight`;
  }, [steps]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawVal = e.target.value;
    const newSteps = parseInt(rawVal.split('_')[0], 10);
    if (!isNaN(newSteps) && newSteps > 0 && newSteps !== steps) {
      onChangeSteps(patternId, newSteps);
    }
  };

  const isCustomStep = ![8, 12, 16, 24].includes(steps);

  return (
    <select
      value={currentKey}
      onChange={handleChange}
      style={{ colorScheme: 'light' }}
      className="text-xs font-semibold bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] px-2 py-1 rounded shadow-[1px_1px_0px_#1a1a1a] cursor-pointer outline-none font-cactus"
      title={isFr ? "Division métrique et longueur de pas" : "Divisão métrica e passos"}
    >
      <option value="16_straight">
        {isFr ? "16 pas — Doubles-croches (4/4)" : "16 passos — Semicolcheias (4/4)"}
      </option>
      <option value="12_triplet">
        {isFr ? "12 pas — Triolets (12/8)" : "12 passos — Tercinas (12/8)"}
      </option>
      <option value="8_straight">
        {isFr ? "8 pas — Deux temps (2/4)" : "8 passos — Dois tempos (2/4)"}
      </option>
      <option value="24_sextuplet">
        {isFr ? "24 pas — Sextolets" : "24 passos — Sextinas"}
      </option>
      {isCustomStep && (
        <option value={`${steps}_straight`}>
          {isFr ? `${steps} pas (Personnalisé)` : `${steps} passos (Personalizado)`}
        </option>
      )}
    </select>
  );
});

MetricDivisionSelector.displayName = 'MetricDivisionSelector';
