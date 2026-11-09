import React from 'react';
import { applyCordelInkedPatina } from '../../utils/colorHelpers';

interface DawStepCellProps {
  stepIdx: number; indexInGroup: number; val: any; effectiveTrackId: number; activePattern: any; inst: any; trackId: number;
  registerStepRef: (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => void;
  handleStepClick: (e: React.MouseEvent, trackId: number, activePattern: any, inst: any, stepIdx: number, currentVal: any) => void;
  isTriplet: boolean; isSextuplet: boolean; isVariationStep: boolean; isGhostStep: boolean; stepOpacity?: number;
  isSplit: boolean; displayVal: string; bgColor: string; txtColor: string;
  leftBg: string; leftTxt: string; leftSym: string; rightBg: string; rightTxt: string; rightSym: string;
  isStepActive: boolean; isVoice: boolean; isProlongation: boolean;
}

export const DawStepCell: React.FC<DawStepCellProps> = ({
  stepIdx, indexInGroup, val, effectiveTrackId, activePattern, inst, trackId,
  registerStepRef, handleStepClick, isTriplet, isSextuplet, isVariationStep, isGhostStep, stepOpacity,
  isSplit, displayVal, bgColor, txtColor, leftBg, leftTxt, leftSym, rightBg, rightTxt, rightSym,
  isStepActive, isVoice, isProlongation,
}) => {
  const commonButtonProps = {
    ref: (el: HTMLButtonElement | null) => registerStepRef(trackId, stepIdx, el),
    'data-step-index': stepIdx,
    onClick: (e: React.MouseEvent) => handleStepClick(e, effectiveTrackId, activePattern, inst, stepIdx, val),
  };

  const clipPath = isSextuplet
    ? indexInGroup % 2 === 0
      ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
      : 'polygon(0% 0%, 100% 0%, 50% 100%)'
    : isTriplet
      ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
      : undefined;

  const rawOpacity = stepOpacity !== undefined ? stepOpacity : isGhostStep ? 0.45 : 1;
  const isDimmedSlave = isStepActive && rawOpacity < 0.99;
  const fillOpacity = isDimmedSlave ? 0.62 : 1;
  const textOpacity = isDimmedSlave ? 0.95 : 1;

  const baseStyle: React.CSSProperties = {
    filter: isTriplet || isSextuplet ? 'drop-shadow(1px 1px 0px rgba(0,0,0,0.35))' : undefined,
    clipPath,
    outline: isVariationStep ? '2px solid #c25e38' : undefined,
    outlineOffset: isVariationStep ? '-2px' : undefined,
    opacity: 1,
  };

  if (isSplit) {
    return (
      <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
        <button
          {...commonButtonProps}
          className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-8 rounded-none outline-none bg-[#ede4d0] dark:bg-[#ebe2ce] border-[1.5px] border-[#1a1a1a] dark:border-black shadow-[1px_1px_0px_#1a1a1a] ${
            isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
          }`}
          style={baseStyle}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-center border-r-[1.5px] border-[#1a1a1a] overflow-hidden">
            <div className="xilo-wood-stamp-cell absolute inset-0 pointer-events-none" style={{ backgroundColor: applyCordelInkedPatina(leftBg), opacity: fillOpacity }} />
            <span
              className={`relative z-10 font-bold text-xs md:text-sm ${isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}`}
              style={{ color: leftTxt, opacity: textOpacity, textShadow: leftTxt === '#1a1a1a' ? 'none' : '0 1px 1px rgba(26,26,26,0.55)' }}
            >
              {leftSym}
            </span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center overflow-hidden">
            <div className="xilo-wood-stamp-cell absolute inset-0 pointer-events-none" style={{ backgroundColor: applyCordelInkedPatina(rightBg), opacity: fillOpacity }} />
            <span
              className={`relative z-10 font-bold text-xs md:text-sm ${isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''}`}
              style={{ color: rightTxt, opacity: textOpacity, textShadow: rightTxt === '#1a1a1a' ? 'none' : '0 1px 1px rgba(26,26,26,0.55)' }}
            >
              {rightSym}
            </span>
          </div>
        </button>
      </div>
    );
  }

  const borderClass = isStepActive
    ? 'border-[1.5px] border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] bg-[#ede4d0] dark:bg-[#ebe2ce]'
    : 'border-[1.5px] border-[#1a1a1a]/35 shadow-[1px_1px_0px_rgba(26,26,26,0.15)] bg-[#ede4d0] dark:bg-[#ebe2ce] text-[#1a1a1a]/50 dark:text-[#1a1a1a]/50';
  const inkedBg = isStepActive ? applyCordelInkedPatina(bgColor) : undefined;

  return (
    <div key={stepIdx} className="flex items-center justify-center h-full flex-1">
      <button
        {...commonButtonProps}
        className={`sequencer-step relative flex items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out flex-1 h-7.5 rounded-none outline-none overflow-hidden ${borderClass} ${
          isTriplet ? 'max-w-[56px]' : isSextuplet ? 'max-w-[34px]' : 'max-w-[48px]'
        }`}
        style={{
          ...baseStyle,
          backgroundColor: !isStepActive && (isTriplet || isSextuplet) ? 'rgba(26, 26, 26, 0.12)' : undefined,
          color: isStepActive ? txtColor : undefined,
        }}
      >
        {isStepActive && (
          <div
            className="xilo-wood-stamp-cell absolute inset-0 pointer-events-none"
            style={{ backgroundColor: inkedBg, opacity: fillOpacity }}
          />
        )}
        <span
          className={`relative z-10 ${isSextuplet ? (indexInGroup % 2 === 0 ? 'translate-y-1' : '-translate-y-1') : isTriplet ? 'translate-y-1' : ''} ${isVoice && isProlongation ? 'tracking-widest font-mono text-xs md:text-sm' : ''} ${isVoice && !isProlongation ? 'font-bold text-xs md:text-sm truncate px-0.5' : ''} ${!isVoice ? 'font-bold text-xs md:text-sm' : ''}`}
          style={isStepActive ? { opacity: textOpacity, textShadow: txtColor === '#1a1a1a' ? 'none' : '0 1px 1px rgba(26,26,26,0.55)' } : undefined}
        >
          {displayVal || '---'}
        </span>
      </button>
    </div>
  );
};
