/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { VoiceKeyCtx } from './voiceKeyCtx';
import { handleVoiceUndoAndPaste } from './voiceStepUndoAndPaste';

export type { VoiceKeyCtx };

export function handleVoiceClipboardAndEdit(
  e: React.KeyboardEvent<HTMLInputElement>,
  field: 'syl' | 'note',
  ctx: VoiceKeyCtx
): boolean {
  if (handleVoiceUndoAndPaste(e, ctx)) return true;

  const input = e.currentTarget;
  const { trackId, patternId, i, isPreRoll, focusVoiceStep, onVoiceNav, onVoiceStepClear, onVoiceSylChange, onVoiceNoteChange } = ctx;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !e.shiftKey && !e.altKey) {
    const selStart = input.selectionStart;
    const selEnd = input.selectionEnd;
    if (!(selStart !== null && selEnd !== null && selStart !== selEnd)) {
      e.preventDefault();
      e.stopPropagation();
      useSequencerStore.getState().copyVoiceStepsRange(useSequencerStore.getState().selectedStepRange, trackId, patternId);
      return true;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !e.shiftKey && !e.altKey) {
    const selStart = input.selectionStart;
    const selEnd = input.selectionEnd;
    if (!(selStart !== null && selEnd !== null && selStart !== selEnd)) {
      e.preventDefault();
      e.stopPropagation();
      useSequencerStore.getState().cutVoiceStepsRange(useSequencerStore.getState().selectedStepRange, trackId, patternId);
      return true;
    }
  }

  if (field === 'syl' && (e.key === ' ' || e.code === 'Space')) {
    e.stopPropagation();
    return true;
  }

  if (field === 'note' && (e.key === ' ' || e.code === 'Space' || e.key === '0')) {
    e.preventDefault();
    e.stopPropagation();
    onVoiceStepClear?.(trackId, patternId, i, Boolean(isPreRoll));
    if (focusVoiceStep) focusVoiceStep(i + 1, field, isPreRoll);
    else onVoiceNav(input, 'ArrowRight', field);
    return true;
  }

  if (e.key === 'Backspace') {
    if (field === 'syl') {
      const selStart = input.selectionStart ?? 0;
      const selEnd = input.selectionEnd ?? 0;
      const valLen = input.value.length;
      if (!(valLen > 0 && selStart === 0 && selEnd === valLen) && valLen > 0 && (selStart > 0 || selStart !== selEnd)) {
        e.stopPropagation();
        return true;
      }
    }
    e.preventDefault();
    e.stopPropagation();
    if (field === 'syl') {
      onVoiceSylChange?.(trackId, patternId, i, '');
      if (focusVoiceStep) focusVoiceStep(i - 1, 'syl', isPreRoll);
      else onVoiceNav(input, 'ArrowLeft', 'syl');
    } else {
      onVoiceNoteChange?.(trackId, patternId, i, '');
      if (focusVoiceStep) focusVoiceStep(i - 1, 'note', isPreRoll);
      else onVoiceNav(input, 'ArrowLeft', 'note');
    }
    return true;
  }

  if (e.key === 'Delete') {
    if (field === 'syl') {
      const selStart = input.selectionStart ?? 0;
      const selEnd = input.selectionEnd ?? 0;
      const valLen = input.value.length;
      if (!(valLen > 0 && selStart === 0 && selEnd === valLen) && valLen > 0 && (selStart < valLen || selStart !== selEnd)) {
        e.stopPropagation();
        return true;
      }
    }
    e.preventDefault();
    e.stopPropagation();
    if (field === 'syl') onVoiceSylChange?.(trackId, patternId, i, '');
    else onVoiceNoteChange?.(trackId, patternId, i, '');
    return true;
  }

  return false;
}
