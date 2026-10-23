
import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';

interface VoiceCardKeyCtx {
  trackId: number;
  patternId: number;
  i: number;
  steps: number;
  isPreRoll?: boolean;
  focusVoiceStep?: (stepIdx: number, type?: 'note' | 'syl', forceInPreRoll?: boolean) => void;
  onVoiceStepClear?: (trackId: number, patternId: number, index: number, isPreRoll?: boolean) => void;
}

export function handleVoiceCardKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  ctx: VoiceCardKeyCtx
): void {
  const { trackId, patternId, i, steps, isPreRoll, focusVoiceStep, onVoiceStepClear } = ctx;

  if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    e.stopPropagation();
    useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, Boolean(isPreRoll), i, true);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    e.stopPropagation();
    useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, Boolean(isPreRoll), i, false);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    const curRange = useSequencerStore.getState().selectedStepRange;
    useSequencerStore.getState().copyVoiceStepsRange(curRange, trackId, patternId);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    e.stopPropagation();
    const curRange = useSequencerStore.getState().selectedStepRange;
    useSequencerStore.getState().cutVoiceStepsRange(curRange, trackId, patternId);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) useSequencerStore.getState().handleRedo();
    else useSequencerStore.getState().handleUndo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    e.stopPropagation();
    useSequencerStore.getState().handleRedo();
    return;
  }
  if (e.key === 'Delete') {
    e.preventDefault();
    e.stopPropagation();
    onVoiceStepClear?.(trackId, patternId, i, Boolean(isPreRoll));
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    onVoiceStepClear?.(trackId, patternId, i, Boolean(isPreRoll));
    focusVoiceStep?.(i - 1, 'syl', isPreRoll);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    focusVoiceStep?.(i + 1, 'syl', isPreRoll);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    e.stopPropagation();
    focusVoiceStep?.(i - 1, 'syl', isPreRoll);
  } else if (e.key === 'ArrowDown') {
    if ((i % 16) < 8 && i + 8 < steps) {
      e.preventDefault();
      e.stopPropagation();
      focusVoiceStep?.(i + 8, 'syl', isPreRoll);
    }
  } else if (e.key === 'ArrowUp') {
    if ((i % 16) >= 8) {
      e.preventDefault();
      e.stopPropagation();
      focusVoiceStep?.(i - 8, 'syl', isPreRoll);
    }
  }
}
