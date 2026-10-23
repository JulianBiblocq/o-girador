import React from 'react';
import { TrackGroup, Pattern } from '../../types';
import { DawStepCell } from './DawStepCell';
import { resolveStepVisual } from './dawStepVisualResolver';
import type { DawStepGridProps } from './dawStepGridTypes';

export const DawStepGrid: React.FC<DawStepGridProps> = ({
  beatGroups,
  track,
  effectiveTrack,
  inst,
  activePattern,
  masterActivePattern,
  isGhostStep,
  isLeftHanded,
  tracks,
  currentMeasure,
  sequencer,
  handleStepClick,
  registerStepRef,
}) => {
  return (
    <div className="flex items-center flex-grow pl-4 pr-3 h-full transition-all duration-200">
      <div className="flex w-full h-full items-center gap-1.5 select-none">
        {beatGroups.map((group, beatIdx) => {
          const isOddBeat = beatIdx % 2 === 0;
          const emptyStepBg = isOddBeat ? '#f4ecd8' : '#e4d9c0';
          const beatBgClass = isOddBeat
            ? 'bg-[#f4ecd8] dark:bg-[#e2d7c0]'
            : 'bg-[#e4d9c0] dark:bg-[#cfc2a8]';
          const isTriplet = group.length === 3;
          const isSextuplet = group.length === 6;

          return (
            <div
              key={beatIdx}
              className={`flex flex-1 h-full items-center py-0.5 px-1 rounded-none border-[1.5px] border-[#1a1a1a]/35 gap-[2px] ${beatBgClass} ${
                isTriplet ? 'justify-between' : ''
              }`}
              style={{
                ...(group.length === 0 && {
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 20px)',
                  backgroundSize: '100% 100%',
                }),
              }}
            >
              {group.map((stepIdx, indexInGroup) => {
                const activePlayingSteps = sequencer.activeVariationsRef?.current?.[effectiveTrack.id];
                const baseVal = isGhostStep
                  ? (masterActivePattern?.activeSteps?.[stepIdx] ?? 0)
                  : (activePattern?.activeSteps?.[stepIdx] ?? 0);
                const liveVal = activePlayingSteps ? (activePlayingSteps[stepIdx] ?? baseVal) : baseVal;
                const val = isGhostStep ? baseVal : liveVal;
                const isVariationStep = Boolean(activePlayingSteps && val !== baseVal);
                const isActiveCell = val !== 0 && val !== '';
                const curPat = isGhostStep ? masterActivePattern : activePattern;

                const {
                  isVoice,
                  isProlongation,
                  displayVal,
                  isSplit,
                  bgColor,
                  txtColor,
                  leftBg,
                  leftTxt,
                  leftSym,
                  rightBg,
                  rightTxt,
                  rightSym,
                } = resolveStepVisual({
                  stepIdx,
                  val,
                  isActiveCell,
                  isGhostStep,
                  curPat,
                  inst,
                  track,
                  tracks,
                  currentMeasure,
                  isLeftHanded,
                  emptyStepBg,
                  effectiveTrack,
                  activePattern,
                });

                const isStepActive = Boolean(
                  isActiveCell || (isVoice && val !== 0 && val !== '' && val !== '0' && val !== '-')
                );

                return (
                  <DawStepCell
                    key={stepIdx}
                    stepIdx={stepIdx}
                    indexInGroup={indexInGroup}
                    val={val}
                    effectiveTrackId={effectiveTrack.id}
                    activePattern={activePattern}
                    inst={inst}
                    trackId={track.id}
                    registerStepRef={registerStepRef}
                    handleStepClick={handleStepClick}
                    isTriplet={isTriplet}
                    isSextuplet={isSextuplet}
                    isVariationStep={isVariationStep}
                    isGhostStep={isGhostStep}
                    isSplit={isSplit}
                    displayVal={displayVal}
                    bgColor={bgColor}
                    txtColor={txtColor}
                    leftBg={leftBg}
                    leftTxt={leftTxt}
                    leftSym={leftSym}
                    rightBg={rightBg}
                    rightTxt={rightTxt}
                    rightSym={rightSym}
                    isStepActive={isStepActive}
                    isVoice={isVoice}
                    isProlongation={isProlongation}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
