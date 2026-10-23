/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableNumber } from './EditableNumber';

interface MicrotimingSliderControlProps {
  totalVal: number;
  swingOffset: number;
  lang: string;
  onChange: (clampedManual: number) => void;
}

export const MicrotimingSliderControl: React.FC<MicrotimingSliderControlProps> = ({
  totalVal,
  swingOffset,
  lang,
  onChange,
}) => {
  const clampedTotalVal = Math.max(-100, Math.min(100, totalVal));

  const handleTotalChange = (newTotal: number) => {
    const newManual = newTotal - swingOffset;
    onChange(Math.max(-100, Math.min(100, newManual)));
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] font-bold items-center">
        <span>Micro-timing ({lang === 'fr' ? 'Décalage' : 'Desvio'})</span>
        <EditableNumber
          value={totalVal}
          suffix="%"
          min={-100}
          max={100}
          onChange={handleTotalChange}
        />
      </div>
      <div className="flex items-center gap-2 relative h-6">
        <span className="text-[8px] font-bold opacity-60 shrink-0">-100%</span>
        <div className="flex-grow h-2 relative flex items-center">
          {/* Background track with a center notch */}
          <div className="absolute inset-x-0 h-1 bg-[#1a1a1a]/15 rounded" />
          <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-3 bg-[#1a1a1a]/40 z-10" />

          {/* Bi-directional Blue track representing offset from center */}
          {totalVal !== 0 && (
            <div
              className="absolute h-1 bg-[#2980b9]"
              style={{
                left: totalVal > 0 ? '50%' : 'auto',
                right: totalVal < 0 ? '50%' : 'auto',
                width: `${Math.min(50, Math.abs(totalVal) / 2)}%`,
              }}
            />
          )}

          <input
            type="range"
            min="-100"
            max="100"
            value={clampedTotalVal}
            onChange={(e) => handleTotalChange(parseInt(e.target.value, 10))}
            className="absolute inset-x-0 w-full h-4 opacity-100 cursor-pointer slider-transparent-track"
          />
        </div>
        <span className="text-[8px] font-bold opacity-60 shrink-0">+50%</span>
      </div>
    </div>
  );
};
