import React from 'react';
import { TimelineStepData } from './TimelineStepPatternResolver';
import { NEWTON_NOTE_COLORS } from '../../data';

interface TimelineStepCellVisualsProps {
  stepData: TimelineStepData;
  trackId: number;
  patternId: number;
  measureIdx: number;
  stepIdx: number;
  stepsCount: number;
  isTriplet: boolean;
  isSextuplet: boolean;
  indexInBeat: number;
  isMacro?: boolean;
  isMinZoom?: boolean;
}

export const TimelineStepCellVisuals: React.FC<TimelineStepCellVisualsProps> = ({
  stepData, trackId, patternId, measureIdx, stepIdx, stepsCount,
  isTriplet, isSextuplet, indexInBeat, isMacro, isMinZoom,
}) => {
  const noteLetter = stepData.note ? stepData.note.charAt(0).toUpperCase() : '';
  const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter as keyof typeof NEWTON_NOTE_COLORS] || '#1a1a1a') : '#1a1a1a';

  let stepBg = '#111';
  let hasBackground = false;
  if (stepData.isRightHalfOnly) {
    stepBg = `linear-gradient(135deg, transparent 50%, ${stepData.rightFillColor} 50%)`;
    hasBackground = true;
  } else if (stepData.isSplit) {
    stepBg = `linear-gradient(135deg, ${stepData.leftFillColor} 50%, ${stepData.rightFillColor} 50%)`;
    hasBackground = true;
  } else if (stepData.leftFillColor !== 'transparent') {
    stepBg = stepData.isVoice ? (noteColor !== '#1a1a1a' ? noteColor : stepData.leftFillColor) : stepData.leftFillColor;
    hasBackground = true;
  }

  const bgOpacity = stepData.renderCas === 4 ? 0.4 : (hasBackground ? 1.0 : 0);
  const cordelStepBorder = 'border border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a] dark:shadow-[1px_1px_0px_rgba(0,0,0,0.8)]';
  const borderClass = stepData.leftIsAccent ? `${cordelStepBorder} ring-1 ring-white/60` : cordelStepBorder;
  const accentClass = `${stepData.leftIsAccent ? 'scale-120' : ''} ${borderClass}`;

  let shapeClipPath: string | undefined = undefined;
  if (isTriplet) shapeClipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
  else if (isSextuplet) shapeClipPath = indexInBeat % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)';

  if (stepData.isVoice) {
    const hasActiveVoice = stepData.val !== 0 && stepData.val !== '' && stepData.val !== '0' && stepData.val !== '-';
    if (!hasActiveVoice) {
      return (
        <div className="timeline-step relative h-full flex-1 border-r border-[var(--cordel-border)]/10 last:border-r-0 flex items-center justify-center pointer-events-none select-none p-[1px]" data-measure={measureIdx} data-step={stepIdx} data-track-id={trackId}>
          <div className={isTriplet || isSextuplet ? 'w-1.5 h-1.5 bg-black/20 dark:bg-white/20' : 'w-[2px] h-[2px] bg-black/10 dark:bg-white/10 rounded-full'} />
        </div>
      );
    }
    const isStart = !stepData.isProlongation;
    const isEnd = !stepData.isFollowedByProlongation;
    const voiceBorderClass = isStart && isEnd
      ? 'border border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a] dark:shadow-[1px_1px_0px_rgba(0,0,0,0.8)] rounded-none my-[1px] mx-[1px]'
      : (isStart
        ? 'border-y border-l border-[#1a1a1a] dark:border-black shadow-[0px_1px_0px_#1a1a1a] dark:shadow-[0px_1px_0px_rgba(0,0,0,0.8)] rounded-none my-[1px] ml-[1px] mr-0'
        : (isEnd
          ? 'border-y border-r border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a] dark:shadow-[1px_1px_0px_rgba(0,0,0,0.8)] rounded-none my-[1px] mr-[1px] ml-0'
          : 'border-y border-[#1a1a1a] dark:border-black shadow-[0px_1px_0px_#1a1a1a] dark:shadow-[0px_1px_0px_rgba(0,0,0,0.8)] rounded-none my-[1px] mx-0'));

    const containerBorder = stepData.isFollowedByProlongation ? 'border-r-0 -mr-px z-10' : 'border-r border-[var(--cordel-border)]/10 last:border-r-0';
    const displayText = stepData.syl || stepData.note || (stepData.isPux ? 'P' : 'C');

    return (
      <div className={`timeline-step relative h-full flex-1 ${containerBorder} flex items-center justify-center pointer-events-none select-none py-[1px]`} data-measure={measureIdx} data-step={stepIdx} data-track-id={trackId} data-pattern-id={patternId}>
        <div className={`w-full h-3 md:h-3.5 flex items-center justify-center transition-all ${voiceBorderClass}`} style={{ backgroundColor: stepData.voiceColor, opacity: bgOpacity }}>
          {isStart && <span className="text-[7px] md:text-[8px] font-bold text-white leading-none truncate px-0.5 select-none">{displayText}</span>}
          {!isStart && !isMacro && !isMinZoom && <span className="text-[6px] text-white/70 font-mono leading-none select-none">──</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-step relative h-full flex-1 border-r border-[var(--cordel-border)]/10 last:border-r-0 flex items-center justify-center pointer-events-none select-none p-[1px]" data-measure={measureIdx} data-step={stepIdx} data-steps={stepsCount} data-track-id={trackId} data-pattern-id={patternId} data-val={Array.isArray(stepData.val) ? stepData.val.join('-') : stepData.val}>
      {hasBackground ? (
        <div className={`${isTriplet || isSextuplet ? 'w-2.5 h-2.5 md:w-3 md:h-3 rounded-none m-[1px]' : 'w-2 h-2 md:w-2.5 md:h-2.5 rounded-none m-[1px]'} ${accentClass}`} style={{ background: (stepData.isSplit || stepData.isRightHalfOnly) ? stepBg : undefined, backgroundColor: (stepData.isSplit || stepData.isRightHalfOnly) ? undefined : stepBg, opacity: bgOpacity, clipPath: shapeClipPath, borderRadius: shapeClipPath ? '0px' : undefined }} />
      ) : (
        <div className={isTriplet || isSextuplet ? 'w-1.5 h-1.5 bg-black/20 dark:bg-white/20' : 'w-[2px] h-[2px] bg-black/10 dark:bg-white/10 rounded-full'} style={{ clipPath: shapeClipPath }} />
      )}
    </div>
  );
};
