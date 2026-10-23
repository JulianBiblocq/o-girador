/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableNumber } from './EditableNumber';

interface VolumeSliderControlProps {
  currVol: number;
  onChange: (val: number) => void;
}

export const VolumeSliderControl: React.FC<VolumeSliderControlProps> = ({
  currVol,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] font-bold items-center">
        <span>Volume</span>
        <EditableNumber
          value={currVol}
          suffix="%"
          min={0}
          max={100}
          onChange={onChange}
        />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={currVol}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-green-600 cursor-pointer h-2 bg-[#1a1a1a]/10"
      />
    </div>
  );
};
