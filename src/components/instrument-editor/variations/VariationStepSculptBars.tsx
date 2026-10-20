/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface VariationStepSculptBarsProps {
  val: string | number | [string, string];
  stepIdx: number;
  variation: any;
  isSelected: boolean;
  selectedSubIndex?: 0 | 1 | null;
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  beatResolutions?: number[];
  onSelectSubIndex?: (subIndex: 0 | 1 | null) => void;
}

export const VariationStepSculptBars: React.FC<VariationStepSculptBarsProps> = React.memo((props) => {
  const { val, stepIdx, variation, isSelected, selectedSubIndex, getStepSwingPercent, beatResolutions, onSelectSubIndex } = props;
  const isSplit = Array.isArray(val);
  const rawVol = variation.volumes?.[stepIdx];
  const vol0 = Array.isArray(rawVol) ? (rawVol[0] ?? 80) : (rawVol ?? 80);
  const vol1 = Array.isArray(rawVol) ? (rawVol[1] ?? 80) : (rawVol ?? 80);
  const rawDec = variation.decays?.[stepIdx];
  const dec0 = Array.isArray(rawDec) ? (rawDec[0] ?? 100) : (rawDec ?? 100);
  const dec1 = Array.isArray(rawDec) ? (rawDec[1] ?? 100) : (rawDec ?? 100);
  const rawMicro = variation.microtimings?.[stepIdx] ?? 0;
  const swingOffset = getStepSwingPercent(stepIdx, variation.steps.length, beatResolutions);
  const totalShift0 = Math.max(-100, Math.min(100, (Array.isArray(rawMicro) ? rawMicro[0] : rawMicro) + swingOffset));
  const totalShift1 = Math.max(-100, Math.min(100, (Array.isArray(rawMicro) ? rawMicro[1] : rawMicro) + swingOffset));

  if (isSplit) {
    return (
      <div className="grid grid-cols-2 gap-[1px] w-full">
        {[0, 1].map((sub) => {
          const v = sub === 0 ? vol0 : vol1;
          const d = sub === 0 ? dec0 : dec1;
          const s = sub === 0 ? totalShift0 : totalShift1;
          return (
            <div
              key={sub}
              className={`flex flex-col gap-[1px] p-[1px] rounded-xs ${
                isSelected && selectedSubIndex === sub ? 'bg-[#8b2a1a]/20 ring-1 ring-[#8b2a1a]' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSubIndex?.(sub as 0 | 1);
              }}
            >
              <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative"><div className="h-full bg-green-600 transition-all" style={{ width: `${v}%` }} /></div>
              <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative"><div className="h-full bg-amber-500 transition-all" style={{ width: `${d}%` }} /></div>
              <div className="h-[2px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                {s !== 0 && (
                  <div
                    className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                    style={{ left: s > 0 ? '50%' : 'auto', right: s < 0 ? '50%' : 'auto', width: `${Math.min(50, Math.abs(s) / 2)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[2px] w-full">
      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative"><div className="h-full bg-green-600 transition-all" style={{ width: `${vol0}%` }} /></div>
      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative"><div className="h-full bg-amber-500 transition-all" style={{ width: `${dec0}%` }} /></div>
      <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
        {totalShift0 !== 0 && (
          <div
            className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
            style={{ left: totalShift0 > 0 ? '50%' : 'auto', right: totalShift0 < 0 ? '50%' : 'auto', width: `${Math.min(50, Math.abs(totalShift0) / 2)}%` }}
          />
        )}
      </div>
    </div>
  );
});

VariationStepSculptBars.displayName = 'VariationStepSculptBars';
