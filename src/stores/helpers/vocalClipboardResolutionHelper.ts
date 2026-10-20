import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { SelectedStepRange } from '../slices/clipboardSliceTypes';

export const resolveEffectiveRange = (
  rangeOverride: SelectedStepRange | null | undefined,
  selectedStepRange: SelectedStepRange | null | undefined,
  selectedStepIdx: number | null | undefined,
  selectedStepIsPreRoll?: boolean
): SelectedStepRange | null => {
  let effectiveRange: SelectedStepRange | null = rangeOverride || selectedStepRange || null;

  if (!effectiveRange && selectedStepIdx !== null && selectedStepIdx !== undefined) {
    const isPreRoll = Boolean(selectedStepIsPreRoll);
    effectiveRange = {
      start: { isPreRoll, step: selectedStepIdx },
      end: { isPreRoll, step: selectedStepIdx }
    };
  }

  if (!effectiveRange && typeof document !== 'undefined') {
    const activeEl = document.activeElement as HTMLElement | null;
    const cellEl = activeEl?.closest?.('.voice-step-cell, [data-step-type="voice"], [data-step-index]');
    if (cellEl) {
      const stepAttr = cellEl.getAttribute('data-step-index');
      const isPreRollAttr = cellEl.getAttribute('data-is-preroll');
      if (stepAttr !== null) {
        const step = parseInt(stepAttr, 10);
        const isPreRoll = isPreRollAttr === 'true';
        effectiveRange = {
          start: { isPreRoll, step },
          end: { isPreRoll, step }
        };
      }
    }
  }

  return effectiveRange;
};

export const resolveVoiceTrackAndPattern = (
  tracks: TrackGroup[],
  trackIdOverride?: number,
  patternIdOverride?: number,
  effectiveRange?: SelectedStepRange | null,
  editingTrackId?: number | null,
  selectedPatternId?: number | null
): { track?: TrackGroup; pattern?: Pattern } => {
  let targetTrackId = trackIdOverride;
  if (targetTrackId === undefined || targetTrackId === null) {
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      const cellEl = activeEl?.closest?.('[data-track-id]');
      if (cellEl) {
        const tAttr = cellEl.getAttribute('data-track-id');
        if (tAttr) targetTrackId = parseInt(tAttr, 10);
      }
    }
  }
  if (targetTrackId === undefined || targetTrackId === null) {
    targetTrackId = editingTrackId ?? undefined;
  }

  let track = targetTrackId !== undefined
    ? tracks.find(t => t.id === targetTrackId || String(t.id) === String(targetTrackId))
    : undefined;

  if (!track) {
    track = tracks.find(t => {
      const instId = instrumentsConfig[t.instrumentIdx]?.id;
      const isVoiceType = instId === 'puxador' || instId === 'coro' || String(t.id).includes('coro') || String(t.id).includes('puxador');
      return isVoiceType && !t.isBusFolder && t.patterns && t.patterns.length > 0;
    });
  }
  if (!track) {
    track = tracks.find(t => {
      const instId = instrumentsConfig[t.instrumentIdx]?.id;
      return (instId === 'puxador' || instId === 'coro') && t.patterns && t.patterns.length > 0;
    });
  }
  if (!track) return {};

  let targetPatternId = patternIdOverride;
  if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
    if (effectiveRange?.patternId !== undefined && effectiveRange?.patternId !== null && effectiveRange?.patternId !== 0) {
      targetPatternId = effectiveRange.patternId;
    }
  }
  if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      const cellEl = activeEl?.closest?.('[data-pattern-id]');
      if (cellEl) {
        const pAttr = cellEl.getAttribute('data-pattern-id');
        if (pAttr) targetPatternId = parseInt(pAttr, 10);
      }
    }
  }
  if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
    targetPatternId = selectedPatternId ?? undefined;
  }
  if (targetPatternId === undefined || targetPatternId === null || targetPatternId === 0) {
    targetPatternId = track.selectedPatternId ?? undefined;
  }

  let pattern = targetPatternId !== undefined
    ? track.patterns.find(p => p.id === targetPatternId || String(p.id) === String(targetPatternId))
    : undefined;

  if (!pattern && track.patterns && track.patterns.length > 0) {
    pattern = track.patterns.find(p => p.id === track?.selectedPatternId) || track.patterns[0];
  }

  return { track, pattern };
};
