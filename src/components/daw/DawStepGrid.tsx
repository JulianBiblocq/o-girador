import React from 'react';
import { TrackGroup, Pattern } from '../../types';
import { DawStepCell } from './DawStepCell';
import { resolveStepVisual } from './dawStepVisualResolver';

interface DawStepGridProps {
  beatGroups: number[][];
  track: TrackGroup;
  effectiveTrack: TrackGroup;
  inst: any;
  activePattern: Pattern | null;
  masterActivePattern: Pattern | null;
  isGhostStep: boolean;
  isLeftHanded: boolean;
  tracks: TrackGroup[];
  currentMeasure: number;
  sequencer: any;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
}

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
    <div className="flex items-center flex-grow pl-4 pr-3 h-full">
      <div className="flex w-full h-full items-center gap-1.5 select-none">
        {beatGroups.map((group, beatIdx) => {
          const isEvenBeat = beatIdx % 2 === 0;
          const emptyStepBg = isEvenBeat ? '#f4ecd8' : '#d2c5b1';
          const isTriplet = group.length === 3;
          const isSextuplet = group.length === 6;

          return (
            <div
              key={beatIdx}
              className={`flex flex-1 h-full items-center py-1 px-1 rounded-none border-[1.5px] border-[#1a1a1a]/30 dark:border-black/40 gap-[2px] ${
                isTriplet ? 'justify-between' : ''
              }`}
              style={{
                backgroundColor: emptyStepBg,
                ...(group.length === 0 && {
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 4px, transparent 4px, transparent 20px)',
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
