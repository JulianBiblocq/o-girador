import React, { useContext } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig, isDarkText, getMaxTicks } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useSequencer } from '../contexts/SequencerContext';
import { getNextStepValue } from '../utils/instrumentStrokes';

interface TimelineStepProps {
  trackId: number;
  patternId: number;
  measureIdx: number;
  stepIdx: number;
  stepsCount: number;
}

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

const TimelineStepComponent: React.FC<TimelineStepProps> = ({
  trackId,
  patternId,
  measureIdx,
  stepIdx,
  stepsCount,
}) => {
  const uiContext = useContext(TimelineUIContext);
  const sequencer = useSequencer();

  // Zustand "ID-Only" selector to retrieve only local properties for this specific step
  const localData = useSequencerStore(
    useShallow(state => {
      const track = state.tracks.find(t => t.id === trackId);
      const pattern = track?.patterns.find(p => p.id === patternId);
      if (!track || !pattern) return null;

      return {
        val: pattern.activeSteps[stepIdx] ?? 0,
        lyric: pattern.lyrics?.[stepIdx] ?? '',
        note: pattern.notes?.[stepIdx] ?? '',
        instrumentIdx: track.instrumentIdx,
        timeSigStr: state.measureTimeSigs[measureIdx] || '4/4',
        beatResolutions: pattern.beatResolutions,
      };
    })
  );

  if (!uiContext || !localData) return null;
  const { MEASURE_W, isPanningActive } = uiContext;
  const { val, lyric, note, instrumentIdx, timeSigStr, beatResolutions } = localData;

  const inst = instrumentsConfig[instrumentIdx];
  if (!inst) return null;

  const display = getDisplayVal(val);
  const isActive = val !== 0 && val !== '';

  // Dynamic step width calculations
  const mMaxTicks = getMaxTicks(timeSigStr);
  const defaultBeats = parseInt(timeSigStr.split('/')[0], 10) || 4;
  const beatRes = beatResolutions || Array(defaultBeats).fill(Math.floor(stepsCount / defaultBeats) || 4);
  
  let stepWidth = MEASURE_W / stepsCount;
  let accumulated = 0;
  
  for (let b = 0; b < beatRes.length; b++) {
    if (stepIdx >= accumulated && stepIdx < accumulated + beatRes[b]) {
      stepWidth = (MEASURE_W / defaultBeats) / beatRes[b];
      break;
    }
    accumulated += beatRes[b];
  }

  let style: React.CSSProperties = {
    width: `${stepWidth}px`,
  };

  if (isActive) {
    const bg = inst.colors[val as string] || '#111';
    let fg = inst.colors.text || '#f4ecd8';
    if (isDarkText(inst.id, String(val))) {
      fg = '#1a1a1a';
    }
    style = { ...style, backgroundColor: bg, color: fg };
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isPanningActive) return;
    e.stopPropagation(); // Avoid triggering timeline playhead navigation in parent container
    const nextVal = getNextStepValue(inst.id, inst.type, val);
    sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, String(nextVal));
  };

  return (
    <div
      className="timeline-step will-change-transform h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center text-center cursor-pointer select-none"
      style={style}
      data-measure={measureIdx}
      data-step={stepIdx}
      data-steps={stepsCount}
      onClick={handleClick}
    >
      {inst.type === 'voice' ? (
        <div className="flex flex-col items-center justify-center leading-none px-0.5 overflow-hidden w-full h-full">
          <span className="text-[9px] font-bold uppercase opacity-75">
            {val === 'P' ? 'PUX' : val === 'C' ? 'CORO' : ''}
          </span>
          <span className="text-[11px] font-cactus font-bold truncate max-w-full">
            {lyric}
          </span>
        </div>
      ) : (
        <span className="text-[13px] font-extrabold tracking-wide">
          {display}
        </span>
      )}
    </div>
  );
};

export const TimelineStep = React.memo(TimelineStepComponent, (prevProps, nextProps) => {
  return (
    prevProps.trackId === nextProps.trackId &&
    prevProps.patternId === nextProps.patternId &&
    prevProps.measureIdx === nextProps.measureIdx &&
    prevProps.stepIdx === nextProps.stepIdx &&
    prevProps.stepsCount === nextProps.stepsCount
  );
});
