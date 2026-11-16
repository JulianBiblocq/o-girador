import React, { useRef, useState } from 'react';
import { instrumentsConfig } from '../../../data';
import { isLightColor } from '../../../universes/maracatu/presets/contrastHelpers';
import { VoiceStepCellProps } from './voiceStepCellTypes';
import { areVoicePropsEqual } from './voiceStepCellComparator';
import { VoiceStepSculptBars } from './VoiceStepSculptBars';
import { handleVoiceClipboardAndEdit } from './voiceStepClipboardAndEdit';
import { handleVoiceArrowAndTabNav } from './voiceStepArrowAndTabNav';
import { handleVoiceCardKeyDown } from './voiceStepCardKeyDown';
import {
  STEP_EMPTY_SELECTED_BG,
  STEP_PASSIVE_CURSOR_SHADOW,
  STEP_SELECTION_BOX_SHADOW,
  StepSelectionCornerBadge,
} from './StepSelectionVisuals';

const VoiceStepCellComponent = ({
  i, steps, trackId, patternId, state, syl, note,
  isSelected, isInRange = false, preRollLength = 16, isMultiSelectActive,
  totalShift, shiftPx, isLinked, volume, decay, isPreRoll,
  onTouchStart, onMouseDown, onMouseEnter, onContextMenu, onSelectForSculpt,
  onVoiceSylChange, onVoiceNoteChange, onVoiceNoteBlur, onFocusStep,
  onVoiceNav, focusVoiceStep, onVoiceStepClear,
  isProlongation = false, isFollowedByProlongation = false, isFirstInBeat,
}: VoiceStepCellProps) => {
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const modifierClickRef = useRef(false);
  const isStepActiveVal = Boolean(state !== 0 && state !== '0' && state !== '' && state !== undefined && state !== null);
  const hasActiveStep = isStepActiveVal || Boolean(note && note.trim() !== '') || Boolean(syl && syl.trim() !== '');
  const inst = instrumentsConfig.find((c) => c.id === (state === 'P' ? 'puxador' : 'coro'));

  const isExplicitSelected = Boolean(isInRange);
  const isPassiveCursor = Boolean(isSelected && !isExplicitSelected);

  const cardBg = hasActiveStep
    ? (isPreRoll ? 'var(--cordel-text-muted)' : (inst?.color || 'var(--cordel-paper-surface)'))
    : isExplicitSelected
      ? STEP_EMPTY_SELECTED_BG
      : isPreRoll
        ? 'color-mix(in srgb, var(--cordel-ink-dark) 8%, transparent)'
        : 'transparent';

  const useLightText = Boolean(note && note.trim() !== '' && hasActiveStep && !isPreRoll && inst?.color && !isLightColor(inst.color, 127));
  const txtColor = useLightText ? 'var(--cordel-paper-surface)' : 'var(--cordel-paper-ink)';
  const isFirstInBeatVal = isFirstInBeat !== undefined ? isFirstInBeat : (i % 4 === 0);

  const geometryClass = isProlongation && isFollowedByProlongation
    ? 'border-y my-[1px] mx-0'
    : isProlongation && !isFollowedByProlongation
      ? 'border-y border-r my-[1px] mr-[1px] ml-0'
      : !isProlongation && isFollowedByProlongation
        ? 'border-y border-l my-[1px] ml-[1px] mr-0'
        : 'border m-[1px]';

  const shadowAndBorderClass = isExplicitSelected
    ? '-translate-y-[2px] z-20 !border-[var(--cordel-accent)]'
    : isPassiveCursor
      ? 'z-20 !border-[var(--cordel-wood)]'
      : isProlongation && isFollowedByProlongation
        ? 'z-10 border-[var(--cordel-ink-dark)] shadow-[0px_1px_0px_var(--cordel-ink-dark)]'
        : !isProlongation && isFollowedByProlongation
          ? 'z-10 border-[var(--cordel-ink-dark)] shadow-[0px_1px_0px_var(--cordel-ink-dark)]'
          : 'z-10 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]';

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'syl' | 'note') => {
    const ctx = { trackId, patternId, i, steps, isPreRoll, preRollLength, onVoiceStepClear, focusVoiceStep, onVoiceNav, onVoiceSylChange, onVoiceNoteChange };
    if (handleVoiceClipboardAndEdit(e, field, ctx)) return;
    handleVoiceArrowAndTabNav(e, field, ctx);
  };

  return (
    <div className={`relative flex-1 min-w-0 select-none ${isProlongation && !isFirstInBeatVal ? '-ml-1 sm:-ml-2 z-10' : ''} ${isExplicitSelected ? 'z-20' : ''}`}>
      <div className="absolute top-[20px] bottom-[10px] left-1/2 w-0 border-l border-dashed border-[var(--cordel-ink-dark)]/30 -translate-x-1/2 pointer-events-none z-0" />
      {isLinked && <div className="absolute top-[48px] -right-[12px] w-[14px] h-[3px] bg-[var(--cordel-wood)]/60 z-20 pointer-events-none rounded-sm" />}
      <div
        className={`v-card voice-step-cell flex flex-col relative transition-transform duration-150 w-full select-none rounded-none ${geometryClass} ${shadowAndBorderClass}`}
        style={{
          transform: `translateX(${shiftPx}px)`,
          backgroundColor: cardBg,
          boxShadow: isExplicitSelected
            ? STEP_SELECTION_BOX_SHADOW
            : isPassiveCursor
              ? STEP_PASSIVE_CURSOR_SHADOW
              : undefined,
        }}
        data-track-id={trackId} data-pattern-id={patternId} data-step-index={i}
        data-step-type="voice" data-is-preroll={isPreRoll ? 'true' : 'false'}
        data-selected={isSelected || isExplicitSelected ? 'true' : undefined}
        tabIndex={-1}
        onKeyDown={(e) => handleVoiceCardKeyDown(e, { trackId, patternId, i, steps, isPreRoll, focusVoiceStep, onVoiceStepClear })}
        onTouchStart={(e) => { if (!e.shiftKey) { onTouchStart?.(e, i); if (!isMultiSelectActive) onFocusStep(i, Boolean(isPreRoll)); } }}
        onMouseDownCapture={(e) => { modifierClickRef.current = Boolean(e.shiftKey || e.ctrlKey || e.metaKey || isMultiSelectActive); }}
        onMouseDown={(e) => { if (e.shiftKey || e.ctrlKey || e.metaKey) window.getSelection()?.removeAllRanges(); onMouseDown?.(e, i); }}
        onClick={(e) => { if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectActive) onFocusStep(i, Boolean(isPreRoll)); modifierClickRef.current = false; }}
        onDoubleClick={(e) => { if (e.shiftKey) window.getSelection()?.removeAllRanges(); }}
        onMouseEnter={(e) => onMouseEnter?.(i, e)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, i); }}
      >
        <div className={`text-[8px] text-[var(--cordel-text-muted)] text-center font-bold bg-[var(--cordel-parchment-panel)] leading-tight py-0.5 ${isProlongation ? 'border-l-0' : ''}`}>{i + 1}</div>
        <input
          type="text" value={syl} readOnly={isMultiSelectActive} placeholder="-"
          onChange={(e) => onVoiceSylChange(trackId, patternId, i, e.target.value)}
          className={`step-input-cell v-syl w-full text-center outline-none border-b border-[var(--cordel-ink-dark)]/15 bg-transparent pb-0.5 select-none ${syl ? 'font-bold' : ''}`}
          style={{ color: txtColor }}
          onFocus={() => { if (!isMultiSelectActive && !modifierClickRef.current) onFocusStep(i, Boolean(isPreRoll)); }}
          onClick={(e) => { if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectActive) onFocusStep(i, Boolean(isPreRoll)); }}
          onKeyDown={(e) => handleInputKeyDown(e, 'syl')}
        />
        <div className="relative w-full h-[24px] flex items-center justify-center cursor-pointer hover:bg-[var(--cordel-ink-dark)]/5">
          <input
            type="text" value={isProlongation && !isNoteFocused ? '───' : (note || '')} readOnly={isMultiSelectActive}
            placeholder={isNoteFocused ? 'C4' : ''}
            onChange={(e) => onVoiceNoteChange(trackId, patternId, i, e.target.value)}
            onBlur={(e) => { onVoiceNoteBlur(trackId, patternId, i, e.target.value); setIsNoteFocused(false); }}
            className="step-input-cell v-note w-full text-center font-bold text-xs outline-none bg-transparent pt-0.5 placeholder:text-[var(--cordel-ink-dark)]/20 select-none"
            style={{ color: isProlongation ? 'var(--cordel-text-muted)' : 'var(--cordel-paper-ink)' }}
            onFocus={() => { if (!isMultiSelectActive && !modifierClickRef.current) { onFocusStep(i, Boolean(isPreRoll)); setIsNoteFocused(true); } }}
            onClick={(e) => { if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectActive) { onFocusStep(i, Boolean(isPreRoll)); setIsNoteFocused(true); } }}
            onKeyDown={(e) => handleInputKeyDown(e, 'note')}
          />
        </div>
        <VoiceStepSculptBars i={i} volume={volume} decay={decay} totalShift={totalShift} onSelectForSculpt={onSelectForSculpt} />
        {isExplicitSelected && <StepSelectionCornerBadge />}
      </div>
    </div>
  );
};

export const VoiceStepCell = React.memo(VoiceStepCellComponent, areVoicePropsEqual);
export type { VoiceStepCellProps };
