import { TrackGroup } from '../../types';
import { SelectedStepRange } from '../slices/clipboardSliceTypes';
import { resolveEffectiveRange, resolveVoiceTrackAndPattern } from './vocalClipboardResolutionHelper';

export const cutVoiceStepsRangeState = (
  tracks: TrackGroup[],
  rangeOverride?: SelectedStepRange | null,
  trackIdOverride?: number,
  patternIdOverride?: number,
  selectedStepRange?: SelectedStepRange | null,
  selectedStepIdx?: number | null,
  selectedStepIsPreRoll?: boolean,
  editingTrackId?: number | null,
  selectedPatternId?: number | null
): { tracks: TrackGroup[]; anchorStep: number; anchorIsPreRoll: boolean } | null => {
  const effectiveRange = resolveEffectiveRange(rangeOverride, selectedStepRange, selectedStepIdx, selectedStepIsPreRoll);
  if (!effectiveRange) return null;

  const { track, pattern } = resolveVoiceTrackAndPattern(tracks, trackIdOverride, patternIdOverride, effectiveRange, editingTrackId, selectedPatternId);
  if (!track || !pattern) return null;

  const preRollStepsCount = pattern.preRollActiveSteps?.length || 16;
  const patternSteps = pattern.steps || 16;

  const toLinear = (p: { isPreRoll: boolean; step: number }) => p.isPreRoll ? p.step : (preRollStepsCount + p.step);
  const minLinear = Math.min(toLinear(effectiveRange.start), toLinear(effectiveRange.end));
  const maxLinear = Math.max(toLinear(effectiveRange.start), toLinear(effectiveRange.end));

  const preRollNotes = [...(pattern.preRollNotes || Array(preRollStepsCount).fill(''))];
  while (preRollNotes.length < preRollStepsCount) preRollNotes.push('');
  const preRollLyrics = [...(pattern.preRollLyrics || Array(preRollStepsCount).fill(''))];
  while (preRollLyrics.length < preRollStepsCount) preRollLyrics.push('');
  const preRollActiveSteps = [...(pattern.preRollActiveSteps || Array(preRollStepsCount).fill(0))];
  while (preRollActiveSteps.length < preRollStepsCount) preRollActiveSteps.push(0);

  const notes = [...(pattern.notes || Array(patternSteps).fill(''))];
  while (notes.length < patternSteps) notes.push('');
  const lyrics = [...(pattern.lyrics || Array(patternSteps).fill(''))];
  while (lyrics.length < patternSteps) lyrics.push('');
  const activeSteps = [...(pattern.activeSteps || Array(patternSteps).fill(0))];
  while (activeSteps.length < patternSteps) activeSteps.push(0);

  for (let l = minLinear; l <= maxLinear; l++) {
    if (l < preRollStepsCount) {
      preRollNotes[l] = '';
      preRollLyrics[l] = '';
      preRollActiveSteps[l] = '0';
    } else {
      const stepIdx = l - preRollStepsCount;
      if (stepIdx < patternSteps) {
        notes[stepIdx] = '';
        lyrics[stepIdx] = '';
        activeSteps[stepIdx] = '0';
      }
    }
  }

  const anchorIsPreRoll = minLinear < preRollStepsCount;
  const anchorStep = anchorIsPreRoll ? minLinear : (minLinear - preRollStepsCount);

  const nextTracks = tracks.map(t => {
    if (t.id === track.id || String(t.id) === String(track.id)) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === pattern.id || String(p.id) === String(pattern.id)) {
            return {
              ...p,
              notes,
              lyrics,
              activeSteps,
              preRollNotes,
              preRollLyrics,
              preRollActiveSteps
            };
          }
          return p;
        })
      };
    }
    return t;
  });

  return { tracks: nextTracks, anchorStep, anchorIsPreRoll };
};
