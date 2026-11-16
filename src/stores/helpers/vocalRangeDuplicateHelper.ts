import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { SelectedStepRange } from '../slices/clipboardSliceTypes';
import { convertStepsToVocalRole } from '../../utils/instrumentCompatibility';
import { copyVoiceStepsRangeState } from './vocalClipboardCopyHelper';
import { pasteVoiceStepsState } from './vocalClipboardPasteHelper';

export function applyVocalRangeDuplicateState(
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  selectedStepRange: SelectedStepRange | null,
  selectedStepIdx: number | null,
  selectedStepIsPreRoll: boolean
): {
  tracks: TrackGroup[];
  nextRange: SelectedStepRange | null;
  nextStepIdx: number;
  nextIsPreRoll: boolean;
} | null {
  const track = tracks.find((t) => t.id === trackId || String(t.id) === String(trackId));
  const pattern = track?.patterns.find((p) => p.id === patternId || String(p.id) === String(patternId));
  if (!track || !pattern) return null;

  const preCount = pattern.preRollActiveSteps?.length || 16;
  const mainCount = pattern.steps || 16;
  const totalLinear = preCount + mainCount;

  const hasValidRange = Boolean(
    selectedStepRange && (!selectedStepRange.patternId || selectedStepRange.patternId === pattern.id)
  );
  const toLinear = (p: { isPreRoll: boolean; step: number }) => (p.isPreRoll ? p.step : preCount + p.step);
  const fromLinear = (lin: number) =>
    lin < preCount ? { isPreRoll: true, step: lin } : { isPreRoll: false, step: lin - preCount };

  let startLin: number;
  let endLin: number;
  if (hasValidRange && selectedStepRange) {
    const a = toLinear(selectedStepRange.start);
    const b = toLinear(selectedStepRange.end);
    startLin = Math.min(a, b);
    endLin = Math.max(a, b);
  } else if (selectedStepIdx !== null && selectedStepIdx !== undefined) {
    startLin = selectedStepIsPreRoll ? selectedStepIdx : preCount + selectedStepIdx;
    endLin = startLin;
  } else {
    return null;
  }

  const length = endLin - startLin + 1;
  const destStartLin = endLin + 1;
  if (destStartLin >= totalLinear) return null;

  const effectiveRange: SelectedStepRange = {
    start: fromLinear(startLin),
    end: fromLinear(endLin),
    patternId: pattern.id,
    trackId: track.id,
  };
  const copied = copyVoiceStepsRangeState(
    tracks, effectiveRange, track.id, pattern.id, effectiveRange, selectedStepIdx, selectedStepIsPreRoll, track.id, pattern.id
  );
  if (!copied || !copied.steps.length) return null;

  const instId = instrumentsConfig[track.instrumentIdx]?.id;
  const isCoro = instId === 'coro' || String(track.id).toLowerCase().includes('coro') || track.customName?.toLowerCase().includes('coro');
  const targetRole: 'P' | 'C' = isCoro ? 'C' : 'P';
  const convertedRoles = convertStepsToVocalRole(copied.steps.map((s) => s.role), targetRole);
  const stepsWithRole = copied.steps.map((s, idx) => ({
    ...s,
    role: (convertedRoles[idx] === 'P' || convertedRoles[idx] === 'C' ? convertedRoles[idx] : '0') as 'P' | 'C' | '0',
  }));

  const destAnchor = fromLinear(destStartLin);
  const nextTracks = pasteVoiceStepsState(
    tracks, stepsWithRole, track.id, pattern.id, destAnchor.isPreRoll, destAnchor.step, false, pattern.id
  );
  if (!nextTracks) return null;

  const destEndLin = Math.min(destStartLin + length - 1, totalLinear - 1);
  const destEnd = fromLinear(destEndLin);

  return {
    tracks: nextTracks,
    nextRange: hasValidRange
      ? { start: destAnchor, end: destEnd, patternId: pattern.id, trackId: track.id }
      : null,
    nextStepIdx: destAnchor.step,
    nextIsPreRoll: destAnchor.isPreRoll,
  };
}
