import React, { useState } from 'react';
import { EditableNumber } from './EditableNumber';
import { StudioRangeSlider } from '../ui/StudioRangeSlider';

interface VolumeSliderControlProps {
  currVol: number;
  onChange: (val: number) => void;
}

export const VolumeSliderControl: React.FC<VolumeSliderControlProps> = ({
  currVol,
  onChange,
}) => {
  const [dragPreviewVal, setDragPreviewVal] = useState<number | null>(null);
  const clampedVol = Math.max(0, Math.min(100, Math.round(currVol)));
  const displayVal = dragPreviewVal ?? clampedVol;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] font-bold items-center select-none">
        <span>Volume</span>
        <EditableNumber
          value={displayVal}
          suffix="%"
          min={0}
          max={100}
          onChange={(val) => {
            setDragPreviewVal(null);
            onChange(val);
          }}
        />
      </div>
      <StudioRangeSlider
        value={clampedVol}
        min={0}
        max={100}
        resetValue={70}
        accentVar="var(--cordel-param-volume)"
        ariaLabel="Volume"
        onVisualChange={setDragPreviewVal}
        onScrub={(val) => onChange(val)}
        onReset={(resetVal) => {
          setDragPreviewVal(null);
          onChange(resetVal);
        }}
      />
    </div>
  );
};
