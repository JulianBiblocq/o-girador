import { TrackGroup, StepSculptValue } from '../../types';
import {
  canTransferPatterns,
  getInstrumentFamily,
  resolveTrackInstrumentId,
} from '../../utils/instrumentCompatibility';
import { cloneStepValue, normalizeStepForTargetInstrument } from '../../utils/patternPasteNormalizer';
import { syncPatternAcrossLinkedFamily, syncVariationAcrossLinkedFamily } from './patternStepLinkedTracksSync';

export interface StepRangeClipboardItem {
  activeStep: string | number | [string, string];
  volume: StepSculptValue;
  decay: StepSculptValue;
  microtiming: StepSculptValue;
}

export interface StepRangeClipboard {
  sourceTrackId: number;
  sourceInstId: string;
  sourceInstrumentType?: string;
  sourceFamily: string;
  steps: StepRangeClipboardItem[];
}

const cloneSculpt = (v: any, fallback: number): StepSculptValue =>
  Array.isArray(v) ? [Number(v[0] ?? fallback), Number(v[1] ?? fallback)] : Number(v ?? fallback);

export function extractStepRangeSlice(
  tracks: TrackGroup[], trackId: number, patternId: number, variationId: string | null, minIdx: number, maxIdx: number
): StepRangeClipboard | null {
  const track = tracks.find((t) => t.id === trackId);
  const ptn = track?.patterns.find((p) => p.id === patternId);
  if (!track || !ptn || minIdx < 0 || maxIdx < minIdx) return null;
  const src = variationId ? ptn.variations?.find((v) => v.id === variationId) : null;
  const rawSteps = src ? src.steps : ptn.activeSteps;
  const rawVols = src ? src.volumes : ptn.volumes, rawDecs = src ? src.decays : ptn.decays, rawMics = src ? src.microtimings : ptn.microtimings;
  const hi = Math.min(maxIdx, (rawSteps?.length || ptn.steps || 16) - 1);
  const instId = resolveTrackInstrumentId(track, tracks);
  if (minIdx > hi || !instId) return null;
  const steps: StepRangeClipboardItem[] = [];
  for (let i = minIdx; i <= hi; i++) {
    steps.push({
      activeStep: cloneStepValue(rawSteps?.[i]),
      volume: cloneSculpt(rawVols?.[i], 70),
      decay: cloneSculpt(rawDecs?.[i], 100),
      microtiming: cloneSculpt(rawMics?.[i], 0),
    });
  }
  return { sourceTrackId: trackId, sourceInstId: instId, sourceInstrumentType: instId, sourceFamily: getInstrumentFamily(instId), steps };
}

export function applyClearStepIndicesState(
  tracks: TrackGroup[], trackId: number, patternId: number, variationId: string | null, indices: number[]
): TrackGroup[] | null {
  if (!indices.length) return null;
  const idxSet = new Set(indices);
  if (variationId) {
    return syncVariationAcrossLinkedFamily(tracks, trackId, patternId, variationId, (v) => {
      const len = v.steps?.length || 16;
      const steps = [...(v.steps || Array(len).fill(0))], volumes = [...(v.volumes || Array(len).fill(70))];
      const decays = [...(v.decays || Array(len).fill(100))], microtimings = [...(v.microtimings || Array(len).fill(0))];
      idxSet.forEach((i) => { if (i >= 0 && i < len) { steps[i] = 0; volumes[i] = 70; decays[i] = 100; microtimings[i] = 0; } });
      return { ...v, steps, volumes, decays, microtimings };
    });
  }
  return syncPatternAcrossLinkedFamily(tracks, trackId, patternId, (p) => {
    const len = p.steps || p.activeSteps?.length || 16;
    const activeSteps = [...(p.activeSteps || Array(len).fill(0))], volumes = [...(p.volumes || Array(len).fill(70))];
    const decays = [...(p.decays || Array(len).fill(100))], microtimings = [...(p.microtimings || Array(len).fill(0))];
    idxSet.forEach((i) => { if (i >= 0 && i < len) { activeSteps[i] = 0; volumes[i] = 70; decays[i] = 100; microtimings[i] = 0; } });
    return { ...p, activeSteps, volumes, decays, microtimings };
  });
}

export function applyPasteStepRangeState(
  tracks: TrackGroup[], clip: StepRangeClipboard, targetTrackId: number,
  targetPatternId: number, targetVariationId: string | null, destStart: number
): { tracks: TrackGroup[]; pastedIndices: number[] } | null {
  const targetTrack = tracks.find((t) => t.id === targetTrackId);
  const targetPtn = targetTrack?.patterns.find((p) => p.id === targetPatternId);
  if (!targetTrack || !targetPtn || !clip?.steps?.length || destStart < 0) return null;
  if (!canTransferPatterns(clip, targetTrack, tracks)) return null;
  const targetVar = targetVariationId ? targetPtn.variations?.find((v) => v.id === targetVariationId) : null;
  const total = targetVar ? (targetVar.steps?.length || targetPtn.steps || 16) : (targetPtn.steps || 16);
  if (destStart >= total) return null;
  const count = Math.min(clip.steps.length, total - destStart);
  const pastedIndices = Array.from({ length: count }, (_, k) => destStart + k);

  if (targetVariationId) {
    const updated = syncVariationAcrossLinkedFamily(tracks, targetTrackId, targetPatternId, targetVariationId, (v, _s, t) => {
      const instId = resolveTrackInstrumentId(t, tracks), len = v.steps?.length || total;
      const steps = [...(v.steps || Array(len).fill(0))], volumes = [...(v.volumes || Array(len).fill(70))];
      const decays = [...(v.decays || Array(len).fill(100))], microtimings = [...(v.microtimings || Array(len).fill(0))];
      for (let k = 0; k < count; k++) {
        const dst = destStart + k, item = clip.steps[k];
        steps[dst] = normalizeStepForTargetInstrument(item.activeStep, instId) as any;
        volumes[dst] = cloneSculpt(item.volume, 70); decays[dst] = cloneSculpt(item.decay, 100); microtimings[dst] = cloneSculpt(item.microtiming, 0);
      }
      return { ...v, steps, volumes, decays, microtimings };
    });
    return { tracks: updated, pastedIndices };
  }
  const updated = syncPatternAcrossLinkedFamily(tracks, targetTrackId, targetPatternId, (p, _s, t) => {
    const instId = resolveTrackInstrumentId(t, tracks), len = p.steps || total;
    const activeSteps = [...(p.activeSteps || Array(len).fill(0))], volumes = [...(p.volumes || Array(len).fill(70))];
    const decays = [...(p.decays || Array(len).fill(100))], microtimings = [...(p.microtimings || Array(len).fill(0))];
    for (let k = 0; k < count; k++) {
      const dst = destStart + k, item = clip.steps[k];
      activeSteps[dst] = normalizeStepForTargetInstrument(item.activeStep, instId);
      volumes[dst] = cloneSculpt(item.volume, 70); decays[dst] = cloneSculpt(item.decay, 100); microtimings[dst] = cloneSculpt(item.microtiming, 0);
    }
    return { ...p, activeSteps, volumes, decays, microtimings };
  });
  return { tracks: updated, pastedIndices };
}

export function applyDuplicateStepRangeState(
  tracks: TrackGroup[], trackId: number, patternId: number, variationId: string | null, minIdx: number, maxIdx: number
): { tracks: TrackGroup[]; duplicatedIndices: number[] } | null {
  const slice = extractStepRangeSlice(tracks, trackId, patternId, variationId, minIdx, maxIdx);
  if (!slice || !slice.steps.length) return null;
  const res = applyPasteStepRangeState(tracks, slice, trackId, patternId, variationId, minIdx + slice.steps.length);
  return res?.pastedIndices.length ? { tracks: res.tracks, duplicatedIndices: res.pastedIndices } : null;
}
