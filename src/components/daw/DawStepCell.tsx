import React from 'react';

interface DawStepCellProps {
  stepIdx: number;
  indexInGroup: number;
  val: any;
  effectiveTrackId: number;
  activePattern: any;
  inst: any;
  trackId: number;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  isTriplet: boolean;
  isSextuplet: boolean;
  isVariationStep: boolean;
  isGhostStep: boolean;
  isSplit: boolean;
  displayVal: string;
  bgColor: string;
  txtColor: string;
  leftBg: string;
  leftTxt: string;
  leftSym: string;
  rightBg: string;
  rightTxt: string;
  rightSym: string;
  isStepActive: boolean;
  isVoice: boolean;
  isProlongation: boolean;
}

export const DawStepCell: React.FC<DawStepCellProps> = ({
  stepIdx,
  indexInGroup,
  val,
  effectiveTrackId,
  activePattern,
  inst,
  trackId,
  registerStepRef,
  handleStepClick,
  isTriplet,
  isSextuplet,
  isVariationStep,
  isGhostStep,
  isSplit,
  displayVal,
  bgColor,
  txtColor,
  leftBg,
  leftTxt,
  leftSym,
  rightBg,
  rightTxt,
  rightSym,
  isStepActive,
  isVoice,
  isProlongation,
}) => {
  const commonButtonProps = {
    ref: (el: HTMLButtonElement | null) => registerStepRef(trackId, stepIdx, el),
    'data-step-index': stepIdx,
    onClick: (e: React.MouseEvent) => handleStepClick(e, effectiveTrackId, activePattern, inst, stepIdx, val),
  };

  const clipPath = isSextuplet
    ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
    : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined;

  const baseStyle: React.CSSProperties = {
    filter: (isTriplet || isSextuplet) ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.35))' : undefined,
    clipPath,
    outline: isVariationStep ? '2px solid #c25e38' : undefined,
    outlineOffset: isVariationStep ? '-2px' : undefined,
    opacity: isGhostStep ? 0.35 : 1,
  };

  if (isSplit) {
    return (
      <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
        <button
          {...commonButtonProps}
          className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-8 rounded-none outline-none border-[1.5px] border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a] ${
            isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
          }`}
          style={baseStyle}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-center border-r-[1.5px] border-[#1a1a1a]" style={{ backgroundColor: leftBg, color: leftTxt }}>
            <span className={`font-bold text-xs md:text-sm ${isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}`}>{leftSym}</span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center" style={{ backgroundColor: rightBg, color: rightTxt }}>
            <span className={`font-bold text-xs md:text-sm ${isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}`}>{rightSym}</span>
          </div>
        </button>
      </div>
    );
  }

  const borderClass = isStepActive
    ? 'border-[1.5px] border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a]'
    : 'border-[1.5px] border-[#1a1a1a]/40 dark:border-black/50 shadow-[1px_1px_0px_rgba(26,26,26,0.25)] bg-[#f4ecd8]/60 dark:bg-[#1a1a1a]/40 text-[#1a1a1a]/40 dark:text-white/40';

  return (
    <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
      <button
        {...commonButtonProps}
        className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-8 rounded-none outline-none ${borderClass} ${
          isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
        }`}
        style={{
          ...baseStyle,
          backgroundColor: (isTriplet || isSextuplet) ? (isStepActive ? bgColor : 'rgba(26, 26, 26, 0.12)') : (isStepActive ? bgColor : undefined),
          color: isStepActive ? txtColor : undefined,
        }}
      >
        <span className={`${isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''} ${isVoice && isProlongation ? 'tracking-widest font-mono text-xs md:text-sm' : ''} ${isVoice && !isProlongation ? 'font-bold text-xs md:text-sm truncate px-0.5' : ''} ${!isVoice ? 'font-bold text-xs md:text-sm' : ''}`}>
          {displayVal || '---'}
        </span>
      </button>
    </div>
  );
};
