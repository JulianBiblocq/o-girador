import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  areStepValuesEqual,
  resolveSlaveStepOpacity,
  SlaveFocusContext,
} from '../../utils/slaveStepOpacityResolver';
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
  const storeState = useSequencerStore.getState();
  const focusCtx: SlaveFocusContext = {
    isFocusActive: storeState.isFocusActive,
    focusTrackId: storeState.focusTrackId,
    referenceTrackId: storeState.referenceTrackId,
    activeAoVivoTrackId: storeState.activeAoVivoTrackId,
    editingTrackId: storeState.editingTrackId,
    mobileViewMode: storeState.mobileViewMode,
  };

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
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 20px)',
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
                const isVariationStep = Boolean(activePlayingSteps && !areStepValuesEqual(val, baseVal));
                const isActiveCell = val !== 0 && val !== '';
                const curPat = isGhostStep ? masterActivePattern : activePattern;

                const stepOpacity = isVariationStep
                  ? 1.0
                  : resolveSlaveStepOpacity({
                      track: effectiveTrack,
                      allTracks: tracks,
                      measureIdx: currentMeasure,
                      stepIdx,
                      ownStepVal: val,
                      focusCtx,
                      activeVariationsMap: sequencer.activeVariationsRef?.current,
                    });

                const visual = resolveStepVisual({
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
                  isActiveCell || (visual.isVoice && val !== 0 && val !== '' && val !== '0' && val !== '-')
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
                    stepOpacity={stepOpacity}
                    isSplit={visual.isSplit}
                    displayVal={visual.displayVal}
                    bgColor={visual.bgColor}
                    txtColor={visual.txtColor}
                    leftBg={visual.leftBg}
                    leftTxt={visual.leftTxt}
                    leftSym={visual.leftSym}
                    rightBg={visual.rightBg}
                    rightTxt={visual.rightTxt}
                    rightSym={visual.rightSym}
                    isStepActive={isStepActive}
                    isVoice={visual.isVoice}
                    isProlongation={visual.isProlongation}
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
