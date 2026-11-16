import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { areStepValuesEqual, resolveSlaveStepOpacity, SlaveFocusContext } from '../../utils/slaveStepOpacityResolver';
import { DawStepCell } from './DawStepCell';
import { resolveStepVisual } from './dawStepVisualResolver';
import { resolveDawPedagogicalClick } from './resolveDawPedagogicalClick';
import type { DawStepGridProps } from './dawStepGridTypes';

const EMPTY_GROUP_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 4px, transparent 4px, transparent 20px)',
  backgroundSize: '100% 100%',
};

export const DawStepGrid: React.FC<DawStepGridProps> = ({
  beatGroups, track, effectiveTrack, inst, activePattern, masterActivePattern,
  isGhostStep, isLeftHanded, tracks, currentMeasure, sequencer, onSelectPedagogyTarget, registerStepRef,
}) => {
  const st = useSequencerStore.getState();
  const focusCtx: SlaveFocusContext = {
    isFocusActive: st.isFocusActive, focusTrackId: st.focusTrackId, referenceTrackId: st.referenceTrackId,
    activeAoVivoTrackId: st.activeAoVivoTrackId, editingTrackId: st.editingTrackId, mobileViewMode: st.mobileViewMode,
  };

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="flex items-center flex-grow pl-4 pr-3 h-full transition-all duration-200">
      <div className="flex w-full h-full items-center gap-1.5 select-none">
        {beatGroups.map((group, beatIdx) => {
          const isOddBeat = beatIdx % 2 === 0;
          const emptyStepBg = isOddBeat ? 'var(--cordel-parchment-bg)' : 'var(--cordel-parchment-panel)';
          const beatBgClass = isOddBeat ? 'bg-[var(--cordel-parchment-bg)]' : 'bg-[var(--cordel-parchment-panel)]';
          const isTriplet = group.length === 3;
          const isSextuplet = group.length === 6;

          return (
            <div
              key={beatIdx}
              className={`flex flex-1 h-full items-center py-0.5 px-1 rounded-none border-[1.5px] border-[var(--cordel-ink-dark)]/35 gap-[2px] ${beatBgClass} ${isTriplet ? 'justify-between' : ''}`}
              style={group.length === 0 ? EMPTY_GROUP_STYLE : undefined}
            >
              {group.map((stepIdx, indexInGroup) => {
                const activePlayingSteps = sequencer.activeVariationsRef?.current?.[effectiveTrack.id];
                const baseVal = isGhostStep ? (masterActivePattern?.activeSteps?.[stepIdx] ?? 0) : (activePattern?.activeSteps?.[stepIdx] ?? 0);
                const val = isGhostStep ? baseVal : (activePlayingSteps ? (activePlayingSteps[stepIdx] ?? baseVal) : baseVal);
                const isVariationStep = Boolean(activePlayingSteps && !areStepValuesEqual(val, baseVal));
                const isActiveCell = val !== 0 && val !== '';
                const curPat = isGhostStep ? masterActivePattern : activePattern;

                const stepOpacity = isVariationStep
                  ? 1.0
                  : resolveSlaveStepOpacity({
                      track: effectiveTrack, allTracks: tracks, measureIdx: currentMeasure,
                      stepIdx, ownStepVal: val, focusCtx, activeVariationsMap: sequencer.activeVariationsRef?.current,
                    });

                const visual = resolveStepVisual({
                  stepIdx, val, isActiveCell, isGhostStep, curPat, inst, track,
                  tracks, currentMeasure, isLeftHanded, emptyStepBg, effectiveTrack, activePattern,
                });

                const isStepActive = Boolean(visual.isVoice ? (visual.isSplit || visual.displayVal !== '') : isActiveCell);

                const handleCellClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!isStepActive) { onSelectPedagogyTarget(null); return; }
                  onSelectPedagogyTarget(resolveDawPedagogicalClick({
                    e, rowTrack: track, effectiveTrack, allTracks: tracks, activePattern, masterActivePattern,
                    inst, measureIdx: currentMeasure, stepIdx, currentVal: val, isLeftHanded, lang: st.lang || 'fr',
                  }));
                };

                return (
                  <DawStepCell
                    key={stepIdx} stepIdx={stepIdx} indexInGroup={indexInGroup} trackId={track.id}
                    registerStepRef={registerStepRef} onPedagogyClick={handleCellClick}
                    isTriplet={isTriplet} isSextuplet={isSextuplet} isVariationStep={isVariationStep}
                    isGhostStep={isGhostStep} stepOpacity={stepOpacity} isSplit={visual.isSplit}
                    displayVal={visual.displayVal} bgColor={visual.bgColor} txtColor={visual.txtColor}
                    leftBg={visual.leftBg} leftTxt={visual.leftTxt} leftSym={visual.leftSym}
                    rightBg={visual.rightBg} rightTxt={visual.rightTxt} rightSym={visual.rightSym}
                    isStepActive={isStepActive} isVoice={visual.isVoice} isProlongation={visual.isProlongation}
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
