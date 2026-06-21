import React from 'react';
import { Pattern } from '../types';
import { getVisualStrokeSymbol, isDarkText } from '../data';

interface CompactPatternRendererProps {
  pattern: Pattern;
  inst: any;
  isLeftHanded?: boolean;
  isEditable?: boolean;
  onStepValueChange?: (stepIdx: number, val: string) => void;
  onStepClick?: (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: string | number) => void;
  onStepShiftClick?: (e: React.MouseEvent, stepIdx: number, val: string | number) => void;
  currentStep?: number | null;
  className?: string;
  style?: React.CSSProperties;
  isFluid?: boolean;
}

export const CompactPatternRenderer: React.FC<CompactPatternRendererProps> = ({
  pattern,
  inst,
  isLeftHanded = false,
  isEditable = false,
  onStepValueChange,
  onStepClick,
  onStepShiftClick,
  currentStep,
  className = '',
  style = {},
  isFluid = false
}) => {
  const defaultBeats = 4;
  const beatRes = pattern.beatResolutions || Array(Math.ceil(pattern.steps / defaultBeats)).fill(defaultBeats);

  const groups: number[][] = [];
  let accumulated = 0;
  for (let b = 0; b < beatRes.length; b++) {
    const res = beatRes[b];
    const group = [];
    for (let i = 0; i < res; i++) {
      if (accumulated + i < pattern.steps) {
        group.push(accumulated + i);
      }
    }
    if (group.length > 0) groups.push(group);
    accumulated += res;
  }

  return (
    <div className={`grid grid-cols-2 gap-x-1 gap-y-1 ${isFluid ? 'w-full' : 'w-max'} ${className}`} style={{ ...style, gridAutoRows: isFluid ? 'minmax(20px, 1fr)' : undefined }}>
      {groups.map((group, groupIdx) => {
        const isTriplet = group.length === 3;
        const isSextuplet = group.length === 6;

        return (
          <div 
            key={groupIdx} 
            className={`flex relative ${isFluid ? 'w-full h-full min-h-[12px]' : isSextuplet ? 'h-[24px]' : ''} ${isTriplet ? 'justify-between' : 'gap-0.5'}`} 
            style={isFluid ? undefined : { width: '64px', flexShrink: 0 }}
          >
            {group.map((stepIdx, indexInGroup) => {
              const val = pattern.activeSteps[stepIdx];
              const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
              let displayVal = visualVal === 0 ? '' : String(visualVal);

              const isActive = val !== 0 && val !== '';
              const isCurrentStep = currentStep === stepIdx;

              let colorStyle: React.CSSProperties = {};
              if (isActive) {
                const bgColor = inst.colors[visualVal as string] || '#111';
                let txtColor = inst.colors.text || '#f4ecd8';
                if (isDarkText(inst.id, visualVal as string)) {
                  txtColor = '#1a1a1a';
                }
                colorStyle = {
                  backgroundColor: bgColor,
                  color: txtColor,
                  border: isSextuplet || isTriplet ? 'none' : `1px solid ${bgColor}`
                };
              } else {
                colorStyle = {
                  backgroundColor: 'rgba(127, 127, 127, 0.15)',
                  border: isSextuplet || isTriplet ? 'none' : '1px solid rgba(127, 127, 127, 0.3)'
                };
              }

              let wrapperClasses = "relative flex items-center justify-center";
              let wrapperStyle: React.CSSProperties = {};
              
              if (isSextuplet) {
                wrapperClasses = "absolute flex items-center justify-center top-0 bottom-0";
                wrapperStyle = isFluid ? { 
                  width: '31.25%', 
                  left: `${indexInGroup * 13.75}%`
                } : { 
                  width: '20px', 
                  left: `${indexInGroup * 8.8}px`
                };
              } else if (isTriplet) {
                wrapperStyle = isFluid ? { width: '28.125%' } : { width: '18px' };
              } else {
                wrapperStyle = { flex: 1 };
              }

              const clipPathStyle = isSextuplet 
                ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined;

              const handleMouseDown = (e: React.MouseEvent) => {
                if (e.button !== 0) return;
                if (e.shiftKey && onStepShiftClick) {
                  onStepShiftClick(e, stepIdx, val);
                } else if (onStepClick) {
                  onStepClick(e, stepIdx, val);
                }
              };

              const handleTouchStart = (e: React.TouchEvent) => {
                if (onStepClick) {
                  e.preventDefault();
                  onStepClick(e, stepIdx, val);
                }
              };

              if (isEditable) {
                return (
                  <div key={stepIdx} className={wrapperClasses} style={wrapperStyle}>
                    <input
                      type="text"
                      maxLength={['caixa', 'tarol'].includes(inst.id) ? 2 : 1}
                      value={displayVal}
                      readOnly={false}
                      className={`w-full h-full text-center text-[9px] font-bold outline-none m-0 p-0 transition-all ${
                        isCurrentStep ? 'scale-110 shadow-[0_0_4px_rgba(139,42,26,0.5)] z-20' : ''
                      } ${!isActive ? 'text-[var(--cordel-text)] opacity-50' : ''}`}
                      style={{
                        ...colorStyle,
                        clipPath: clipPathStyle,
                        borderRadius: isSextuplet || isTriplet ? '0' : '2px',
                        cursor: 'pointer'
                      }}
                      onChange={(e) => onStepValueChange && onStepValueChange(stepIdx, e.target.value)}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                    />
                  </div>
                );
              } else {
                return (
                  <div key={stepIdx} className={wrapperClasses} style={wrapperStyle}>
                    <div
                      className={`w-full h-full flex items-center justify-center text-[9px] font-bold ${
                        isCurrentStep ? 'scale-110 shadow-[0_0_4px_rgba(139,42,26,0.5)] z-20' : ''
                      } ${!isActive ? 'text-[var(--cordel-text)] opacity-20' : ''}`}
                      style={{
                        ...colorStyle,
                        clipPath: clipPathStyle,
                        borderRadius: isSextuplet || isTriplet ? '0' : '2px'
                      }}
                    >
                      {displayVal}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        );
      })}
    </div>
  );
};
