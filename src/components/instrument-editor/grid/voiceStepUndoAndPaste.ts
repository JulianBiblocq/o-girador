/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { VoiceKeyCtx } from './voiceStepClipboardAndEdit';

export function handleVoiceUndoAndPaste(
  e: React.KeyboardEvent<HTMLInputElement>,
  ctx: VoiceKeyCtx
): boolean {
  const input = e.currentTarget;
  const { trackId, patternId, i, isPreRoll } = ctx;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) useSequencerStore.getState().handleRedo();
    else useSequencerStore.getState().handleUndo();
    return true;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    e.stopPropagation();
    useSequencerStore.getState().handleRedo();
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && e.key.toLowerCase() === 'v') {
    const selStart = input.selectionStart;
    const selEnd = input.selectionEnd;
    if (!(selStart !== null && selEnd !== null && selStart !== selEnd)) {
      e.preventDefault();
      e.stopPropagation();
      useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, Boolean(isPreRoll), i, true);
      return true;
    }
  }

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'v') {
    const selStart = input.selectionStart;
    const selEnd = input.selectionEnd;
    if (!(selStart !== null && selEnd !== null && selStart !== selEnd)) {
      e.preventDefault();
      e.stopPropagation();
      useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, Boolean(isPreRoll), i, false);
      return true;
    }
  }

  return false;
}
