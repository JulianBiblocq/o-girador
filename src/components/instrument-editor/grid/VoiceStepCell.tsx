/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { instrumentsConfig } from '../../../data';
import { getContrastColor } from '../../../utils/colorHelpers';
import { VoiceStepCellProps } from './voiceStepCellTypes';
import { areVoicePropsEqual } from './voiceStepCellComparator';
import { VoiceStepSculptBars } from './VoiceStepSculptBars';
import { handleVoiceClipboardAndEdit } from './voiceStepClipboardAndEdit';
import { handleVoiceArrowAndTabNav } from './voiceStepArrowAndTabNav';
import { handleVoiceCardKeyDown } from './voiceStepCardKeyDown';

const VoiceStepCellComponent = ({
  i,
  steps,
  trackId,
  patternId,
  state,
  syl,
  note,
  isSelected,
  isInRange = false,
  preRollLength = 16,
  isMultiSelectActive,
  totalShift,
  shiftPx,
  isLinked,
  volume,
  decay,
  isPreRoll,
  onTouchStart,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
  onSelectForSculpt,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  onFocusStep,
  onVoiceNav,
  focusVoiceStep,
  onVoiceStepClear,
  isProlongation = false,
  isFollowedByProlongation = false,
  isFirstInBeat
}: VoiceStepCellProps) => {
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const isStepActiveVal = Boolean(state !== 0 && state !== '0' && state !== '' && state !== undefined && state !== null);
  const hasActiveStep = isStepActiveVal || Boolean(note && note.trim() !== '') || Boolean(syl && syl.trim() !== '');
  const inst = instrumentsConfig.find(c => c.id === (state === 'P' ? 'puxador' : 'coro')) || { color: '#f4ecd8' };
  const cardBg = hasActiveStep ? (isPreRoll ? '#999999' : inst.color) : (isPreRoll ? 'rgba(0, 0, 0, 0.08)' : 'transparent');
  const txtColor = (note && note.trim() !== '') ? getContrastColor(cardBg || '#f4ecd8') : '#1a1a1a';
  const isFirstInBeatVal = isFirstInBeat !== undefined ? isFirstInBeat : (i % 4 === 0);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'syl' | 'note') => {
    const ctx = { trackId, patternId, i, steps, isPreRoll, preRollLength, onVoiceStepClear, focusVoiceStep, onVoiceNav, onVoiceSylChange, onVoiceNoteChange };
    if (handleVoiceClipboardAndEdit(e, field, ctx)) return;
    handleVoiceArrowAndTabNav(e, field, ctx);
  };

  return (
    <div className={`relative flex-1 min-w-0 select-none ${isProlongation && !isFirstInBeatVal ? '-ml-1 sm:-ml-2 z-10' : ''}`}>
      <div className="absolute top-[20px] bottom-[10px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />
      {isLinked && <div className="absolute top-[48px] -right-[12px] w-[14px] h-[3px] bg-[#8b2a1a]/60 z-20 pointer-events-none rounded-sm" />}
      <div
        className={`v-card voice-step-cell flex flex-col z-10 relative transition-all duration-100 w-full select-none ${
          isSelected
            ? '!border-2 !border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f] rounded-none m-[1px]'
            : isInRange
              ? '!border-2 !border-amber-500/90 bg-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.6)] rounded-none m-[1px]'
              : isProlongation && isFollowedByProlongation
                ? 'border-y border-[#1a1a1a] shadow-[0px_1px_0px_#1a1a1a] rounded-none my-[1px] mx-0'
                : isProlongation && !isFollowedByProlongation
                  ? 'border-y border-r border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none my-[1px] mr-[1px] ml-0'
                  : !isProlongation && isFollowedByProlongation
                    ? 'border-y border-l border-[#1a1a1a] shadow-[0px_1px_0px_#1a1a1a] rounded-none my-[1px] ml-[1px] mr-0'
                    : 'border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none m-[1px]'
        }`}
        style={{ transform: `translateX(${shiftPx}px)`, backgroundColor: cardBg }}
        data-track-id={trackId}
        data-pattern-id={patternId}
        data-step-index={i}
        data-step-type="voice"
        data-is-preroll={isPreRoll ? "true" : "false"}
        data-selected={isSelected ? "true" : undefined}
        tabIndex={-1}
        onKeyDown={(e) => handleVoiceCardKeyDown(e, { trackId, patternId, i, steps, isPreRoll, focusVoiceStep, onVoiceStepClear })}
        onTouchStart={(e) => { if (!e.shiftKey) { onTouchStart?.(e, i); onFocusStep(i, Boolean(isPreRoll)); } }}
        onMouseDown={(e) => { if (e.shiftKey) { window.getSelection()?.removeAllRanges(); } onMouseDown?.(e, i); }}
        onClick={(e) => { if (!e.shiftKey) onFocusStep(i, Boolean(isPreRoll)); }}
        onDoubleClick={(e) => { if (e.shiftKey) window.getSelection()?.removeAllRanges(); }}
        onMouseEnter={(e) => onMouseEnter?.(i, e)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, i); }}
      >
        <div className={`text-[8px] text-[#999] text-center font-bold bg-[#ece4d0] leading-tight py-0.5 ${isProlongation ? 'border-l-0' : ''}`}>{i + 1}</div>
        <input
          type="text"
          value={syl}
          readOnly={isMultiSelectActive}
          onChange={(e) => onVoiceSylChange(trackId, patternId, i, e.target.value)}
          placeholder="-"
          className={`step-input-cell v-syl w-full text-center outline-none border-b border-[#00000020] bg-transparent pb-0.5 select-none ${syl ? 'font-bold' : ''}`}
          style={{ color: isMultiSelectActive && isSelected ? 'transparent' : txtColor }}
          onFocus={() => { if (!isMultiSelectActive) onFocusStep(i, Boolean(isPreRoll)); }}
          onClick={(e) => { if (!e.shiftKey && !isMultiSelectActive) onFocusStep(i, Boolean(isPreRoll)); }}
          onKeyDown={(e) => handleInputKeyDown(e, 'syl')}
        />
        <div className="relative w-full h-[24px] flex items-center justify-center cursor-pointer hover:bg-black/5">
          <input
            type="text"
            value={isProlongation && !isNoteFocused ? '───' : (note || '')}
            readOnly={isMultiSelectActive}
            onChange={(e) => onVoiceNoteChange(trackId, patternId, i, e.target.value)}
            onBlur={(e) => { onVoiceNoteBlur(trackId, patternId, i, e.target.value); setIsNoteFocused(false); }}
            placeholder={isNoteFocused ? 'C4' : ''}
            className="step-input-cell v-note w-full text-center font-bold text-xs outline-none bg-transparent pt-0.5 placeholder:text-black/20 select-none"
            style={{ color: isMultiSelectActive && isSelected ? 'transparent' : (isProlongation ? '#666666' : '#1a1a1a') }}
            onFocus={() => { if (!isMultiSelectActive) { onFocusStep(i, Boolean(isPreRoll)); setIsNoteFocused(true); } }}
            onClick={(e) => { if (!e.shiftKey && !isMultiSelectActive) { onFocusStep(i, Boolean(isPreRoll)); setIsNoteFocused(true); } }}
            onKeyDown={(e) => handleInputKeyDown(e, 'note')}
          />
        </div>
        <VoiceStepSculptBars i={i} volume={volume} decay={decay} totalShift={totalShift} onSelectForSculpt={onSelectForSculpt} />
      </div>
    </div>
  );
};

export const VoiceStepCell = React.memo(VoiceStepCellComponent, areVoicePropsEqual);
export type { VoiceStepCellProps };
