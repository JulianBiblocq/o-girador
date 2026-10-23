
import React from 'react';
import { CompactPatternRendererProps } from './compact-pattern/compactPatternTypes';
import { CompactStepCell } from './compact-pattern/CompactStepCell';

export type { CompactPatternRendererProps };

export const CompactPatternRenderer: React.FC<CompactPatternRendererProps> = ({
  pattern, inst, isLeftHanded = false, isEditable = false, onStepValueChange,
  onStepClick, onStepShiftClick, className = '', style = {}, isFluid = false,
  readOnly = false, onStepKeyDown, registerStepRef, onStepMouseEnter,
  selectedStepIndices = [], trackId, isLinkFolder = false, tracks = [],
}) => {
  const defaultBeats = 4;
  const beatRes = pattern.beatResolutions || Array(defaultBeats).fill(4);
  const groups: number[][] = [];
  let accumulated = 0;

  for (let b = 0; b < beatRes.length; b++) {
    const res = beatRes[b];
    const group: number[] = [];
    for (let i = 0; i < res; i++) {
      if (accumulated + i < pattern.steps) group.push(accumulated + i);
    }
    if (group.length > 0) groups.push(group);
    accumulated += res;
  }

  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-2 ${isFluid ? 'w-full' : 'w-max'} ${className}`} style={{ ...style, gridAutoRows: isFluid ? 'minmax(20px, 1fr)' : undefined }}>
      {groups.map((group, groupIdx) => {
        const isTriplet = group.length === 3;
        const isSextuplet = group.length === 6;

        return (
          <div
            key={groupIdx}
            className={`flex relative ${isFluid ? 'w-full h-full min-h-[12px]' : isSextuplet ? 'h-[24px]' : ''} ${isTriplet ? 'justify-between' : 'gap-0.5'}`}
            style={isFluid ? undefined : { width: '64px', flexShrink: 0 }}
          >
            {group.map((stepIdx, indexInGroup) => (
              <CompactStepCell
                key={stepIdx} stepIdx={stepIdx} val={pattern.activeSteps[stepIdx]}
                indexInGroup={indexInGroup} isTriplet={isTriplet} isSextuplet={isSextuplet}
                isFluid={isFluid} isEditable={isEditable} readOnly={readOnly}
                isSelected={selectedStepIndices.includes(stepIdx)}
                cellId={trackId ? `step-cell-${trackId}-${pattern.id}-${stepIdx}` : undefined}
                inst={inst} isLeftHanded={isLeftHanded} isVoice={inst.type === 'voice'}
                pattern={pattern} trackId={trackId} isLinkFolder={isLinkFolder} tracks={tracks}
                onStepValueChange={onStepValueChange} onStepClick={onStepClick}
                onStepShiftClick={onStepShiftClick} onStepKeyDown={onStepKeyDown}
                registerStepRef={registerStepRef} onStepMouseEnter={onStepMouseEnter}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
