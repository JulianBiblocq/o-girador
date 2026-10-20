import { useSequencerStore } from '../../stores/useSequencerStore';

let lastStepUndoTime = 0;

export function writePercussionStepAndAdvance(
  targetTrack: any,
  strokeChar: string,
  seqStore: any
): void {
  const currentStepIdx = seqStore.selectedStepIdx;
  if (currentStepIdx === null || currentStepIdx === undefined || !targetTrack) return;

  const targetPatternId = targetTrack.selectedPatternId || targetTrack.patterns?.[0]?.id;
  const targetPattern = targetTrack.patterns?.find((p: any) => p.id === targetPatternId);
  if (!targetPatternId || !targetPattern) return;

  const now = Date.now();
  if (now - lastStepUndoTime > 1500) {
    seqStore.pushUndoState();
    lastStepUndoTime = now;
  }

  const currentVal = targetPattern.activeSteps?.[currentStepIdx];
  const selectedSubIndex = seqStore.selectedSubIndex;
  let finalVal: string | number | [string, string] = strokeChar;

  if (Array.isArray(currentVal)) {
    if (selectedSubIndex === 1) {
      finalVal = [currentVal[0] || '0', strokeChar];
    } else {
      finalVal = [strokeChar, currentVal[1] || '0'];
    }
  } else {
    finalVal = strokeChar;
  }

  seqStore.updatePatternStep(targetTrack.id, targetPatternId, currentStepIdx, finalVal);

  const cellElements = document.querySelectorAll<HTMLElement>(
    `[data-pattern-id="${targetPatternId}"][data-step-index="${currentStepIdx}"]`
  );
  cellElements.forEach(cellEl => {
    cellEl.animate([
      { transform: 'scale(1.25)', filter: 'brightness(1.8)', opacity: 1 },
      { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 }
    ], { duration: 160, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
  });

  const patternSteps = targetPattern.steps || 16;
  let nextStepIdx = currentStepIdx;
  let nextSubIndex: 0 | 1 | null = null;

  if (Array.isArray(currentVal) && selectedSubIndex === 0) {
    nextSubIndex = 1;
    nextStepIdx = currentStepIdx;
  } else {
    nextStepIdx = (currentStepIdx + 1) % patternSteps;
    const nextStepVal = targetPattern.activeSteps?.[nextStepIdx];
    nextSubIndex = Array.isArray(nextStepVal) ? 0 : null;
  }

  useSequencerStore.setState({
    selectedStepIdx: nextStepIdx,
    selectedSubIndex: nextSubIndex
  });

  window.dispatchEvent(new CustomEvent('focus-percussion-step', {
    detail: { stepIdx: nextStepIdx, subIndex: nextSubIndex }
  }));

  try {
    const nextInput = document.querySelector<HTMLInputElement>(
      nextSubIndex !== null
        ? `[data-pattern-id="${targetPatternId}"][data-step-index="${nextStepIdx}"][data-sub-index="${nextSubIndex}"]`
        : `input[data-pattern-id="${targetPatternId}"][data-step-index="${nextStepIdx}"]`
    );
    if (nextInput) {
      nextInput.focus();
      if (nextInput.select) nextInput.select();
    }
  } catch (_) {}
}
