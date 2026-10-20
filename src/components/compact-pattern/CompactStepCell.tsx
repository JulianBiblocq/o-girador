/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getVisualStrokeSymbol, isDarkText, instrumentsConfig, NEWTON_NOTE_COLORS } from '../../data';
import { getBusNoteColor, getContrastColor } from '../../utils/colorHelpers';

interface CompactStepCellProps {
  stepIdx: number;
  val: any;
  indexInGroup: number;
  isTriplet: boolean;
  isSextuplet: boolean;
  isFluid?: boolean;
  isEditable?: boolean;
  readOnly?: boolean;
  isSelected: boolean;
  cellId?: string;
  inst: any;
  isLeftHanded?: boolean;
  isVoice: boolean;
  pattern: any;
  trackId?: string;
  isLinkFolder?: boolean;
  tracks?: any[];
  onStepValueChange?: (stepIdx: number, val: string) => void;
  onStepClick?: (e: React.MouseEvent | React.TouchEvent, stepIdx: number, val: any) => void;
  onStepShiftClick?: (e: React.MouseEvent, stepIdx: number, val: any) => void;
  onStepKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, stepIdx: number, val: any) => void;
  registerStepRef?: (stepIdx: number, el: HTMLInputElement | null) => void;
  onStepMouseEnter?: (stepIdx: number) => void;
}

export const CompactStepCell: React.FC<CompactStepCellProps> = React.memo((props) => {
  const {
    stepIdx, val, indexInGroup, isTriplet, isSextuplet, isFluid, isEditable,
    readOnly, isSelected, cellId, inst, isLeftHanded = false, isVoice, pattern,
    trackId, isLinkFolder, tracks = [], onStepValueChange, onStepClick,
    onStepShiftClick, onStepKeyDown, registerStepRef, onStepMouseEnter,
  } = props;

  const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
  const note = isVoice ? (pattern.notes?.[stepIdx] || '') : '';
  const noteLetter = note ? note.charAt(0).toUpperCase() : '';
  const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter] || '#1a1a1a') : '#1a1a1a';
  const displayVal = visualVal === 0 ? '' : (isVoice ? noteLetter : String(visualVal));
  const isActive = val !== 0 && val !== '';

  let colorStyle: React.CSSProperties = {};
  if (isActive) {
    const bgColor = isLinkFolder && trackId
      ? getBusNoteColor(String(trackId), String(visualVal), tracks, instrumentsConfig)
      : (isVoice ? inst.color : (inst.colors[visualVal as string] || '#111'));
    let txtColor = isVoice ? noteColor : (inst.colors.text || '#f4ecd8');
    if (isLinkFolder) txtColor = getContrastColor(bgColor);
    else if (!isVoice && isDarkText(inst.id, visualVal as string)) txtColor = '#1a1a1a';

    colorStyle = {
      backgroundColor: bgColor, color: txtColor,
      textShadow: isVoice ? '0 1px 2px rgba(0, 0, 0, 0.4)' : undefined,
      border: isSextuplet || isTriplet ? 'none' : `1px solid ${bgColor}`,
    };
  } else {
    colorStyle = { backgroundColor: 'rgba(127, 127, 127, 0.15)', border: isSextuplet || isTriplet ? 'none' : '1px solid rgba(127, 127, 127, 0.3)' };
  }

  let wrapperClasses = 'relative flex items-center justify-center';
  let wrapperStyle: React.CSSProperties = { flex: 1 };
  if (isSextuplet) {
    wrapperClasses = 'absolute flex items-center justify-center top-0 bottom-0';
    wrapperStyle = isFluid ? { width: '31.25%', left: `${indexInGroup * 13.75}%` } : { width: '20px', left: `${indexInGroup * 8.8}px` };
  } else if (isTriplet) {
    wrapperStyle = isFluid ? { width: '28.125%' } : { width: '18px' };
  }

  const clipPathStyle = isSextuplet
    ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
    : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey && onStepShiftClick) onStepShiftClick(e, stepIdx, val);
    else if (onStepClick) onStepClick(e, stepIdx, val);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (onStepClick) { e.preventDefault(); onStepClick(e, stepIdx, val); }
  };

  if (isEditable) {
    return (
      <div key={stepIdx} id={cellId} className={`${wrapperClasses} ${isSelected ? 'shadow-[0_0_8px_#f1c40f]' : ''}`} style={wrapperStyle}>
        <input
          type="text" maxLength={['caixa', 'tarol', 'timbal'].includes(inst.id) ? 2 : 1}
          value={displayVal} readOnly={readOnly}
          className={`w-full h-full text-center text-[9px] font-bold outline-none m-0 p-0 transition-all ${
            isSelected ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-105 z-10' : ''
          } ${!isActive ? 'text-[var(--cordel-text)] opacity-50' : ''}`}
          style={{ ...colorStyle, clipPath: clipPathStyle, borderRadius: isSextuplet || isTriplet ? '0' : '2px', cursor: 'pointer' }}
          ref={(el) => registerStepRef && registerStepRef(stepIdx, el)}
          onChange={(e) => onStepValueChange && onStepValueChange(stepIdx, e.target.value)}
          onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}
          onKeyDown={(e) => onStepKeyDown && onStepKeyDown(e, stepIdx, val)}
          onMouseEnter={() => onStepMouseEnter && onStepMouseEnter(stepIdx)}
        />
      </div>
    );
  }

  return (
    <div key={stepIdx} className={wrapperClasses} style={wrapperStyle}>
      <div
        className={`w-full h-full flex items-center justify-center text-[9px] font-bold ${!isActive ? 'text-[var(--cordel-text)] opacity-20' : ''}`}
        style={{ ...colorStyle, clipPath: clipPathStyle, borderRadius: isSextuplet || isTriplet ? '0' : '2px' }}
      >
        {displayVal}
      </div>
    </div>
  );
});

CompactStepCell.displayName = 'CompactStepCell';
