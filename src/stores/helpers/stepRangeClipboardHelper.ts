import { TrackGroup, StepSculptValue } from '../../types';
import { instrumentsConfig } from '../../data';
import { canTransferPatterns, getInstrumentFamily } from '../../utils/instrumentCompatibility';
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
  sourceFamily: string;
  steps: StepRangeClipboardItem[];
}

const cloneStepVal = (v: any): string | number | [string, string] =>
  Array.isArray(v) ? [String(v[0] ?? '0'), String(v[1] ?? '0')] : (v === undefined || v === null || v === '' ? 0 : v);
const cloneSculpt = (v: any, fallback: number): StepSculptValue =>
  Array.isArray(v) ? [Number(v[0] ?? fallback), Number(v[1] ?? fallback)] : Number(v ?? fallback);

function normAlfaiaStep(val: string | number | [string, string], instId?: string): string | number | [string, string] {
  const isAlfaia = Boolean(instId && ['marcante', 'meiao', 'repique', 'alfaia'].includes(instId));
  if (!isAlfaia) return cloneStepVal(val);
  if (Array.isArray(val)) return [val[0] === 'a' ? 'A' : String(val[0]), val[1] === 'a' ? 'A' : String(val[1])];
  return val === 'a' ? 'A' : cloneStepVal(val);
}

export function extractStepRangeSlice(
  tracks: TrackGroup[], trackId: number, patternId: number, variationId: string | null, minIdx: number, maxIdx: number
): StepRangeClipboard | null {
  const track = tracks.find((t) => t.id === trackId);
  const ptn = track?.patterns.find((p) => p.id === patternId);
  if (!track || !ptn || minIdx < 0 || maxIdx < minIdx) return null;
  const src = variationId ? ptn.variations?.find((v) => v.id === variationId) : null;
  const rawSteps = src ? src.steps : ptn.activeSteps;
  const rawVols = src ? src.volumes : ptn.volumes;
  const rawDecs = src ? src.decays : ptn.decays;
  const rawMics = src ? src.microtimings : ptn.microtimings;
  const total = rawSteps?.length || ptn.steps || 16;
  const hi = Math.min(maxIdx, total - 1);
  if (minIdx > hi) return null;
  const instId = instrumentsConfig[track.instrumentIdx]?.id || '';
  const items: StepRangeClipboardItem[] = [];
  for (let i = minIdx; i <= hi; i++) {
    items.push({
      activeStep: cloneStepVal(rawSteps?.[i]),
      volume: cloneSculpt(rawVols?.[i], 70),
      decay: cloneSculpt(rawDecs?.[i], 100),
      microtiming: cloneSculpt(rawMics?.[i], 0),
    });
  }
  return { sourceTrackId: trackId, sourceInstId: instId, sourceFamily: getInstrumentFamily(instId), steps: items };
}

export function applyClearStepIndicesState(
  tracks: TrackGroup[], trackId: number, patternId: number, variationId: string | null, indices: number[]
): TrackGroup[] | null {
  if (!indices.length) return null;
  const idxSet = new Set(indices);
  if (variationId) {
    return syncVariationAcrossLinkedFamily(tracks, trackId, patternId, variationId, (v) => {
      const len = v.steps?.length || 16;
      const steps = [...(v.steps || Array(len).fill(0))];
      const volumes = [...(v.volumes || Array(len).fill(70))];
      const decays = [...(v.decays || Array(len).fill(100))];
      const microtimings = [...(v.microtimings || Array(len).fill(0))];
      idxSet.forEach((i) => { if (i >= 0 && i < len) { steps[i] = 0; volumes[i] = 70; decays[i] = 100; microtimings[i] = 0; } });
      return { ...v, steps, volumes, decays, microtimings };
    });
  }
  return syncPatternAcrossLinkedFamily(tracks, trackId, patternId, (p) => {
    const len = p.steps || p.activeSteps?.length || 16;
    const activeSteps = [...(p.activeSteps || Array(len).fill(0))];
    const volumes = [...(p.volumes || Array(len).fill(70))];
    const decays = [...(p.decays || Array(len).fill(100))];
    const microtimings = [...(p.microtimings || Array(len).fill(0))];
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
  if (!targetTrack || !targetPtn || !clip.steps.length || destStart < 0) return null;
  if (!canTransferPatterns({ sourceInstId: clip.sourceInstId, sourceFamily: clip.sourceFamily }, targetTrack)) return null;
  const targetVar = targetVariationId ? targetPtn.variations?.find((v) => v.id === targetVariationId) : null;
  const total = targetVar ? (targetVar.steps?.length || targetPtn.steps || 16) : (targetPtn.steps || 16);
  if (destStart >= total) return null;
  const pastedIndices: number[] = [];
  const count = Math.min(clip.steps.length, total - destStart);
  for (let k = 0; k < count; k++) pastedIndices.push(destStart + k);

  if (targetVariationId) {
    const updated = syncVariationAcrossLinkedFamily(tracks, targetTrackId, targetPatternId, targetVariationId, (v, _s, t) => {
      const instId = instrumentsConfig[t.instrumentIdx]?.id;
      const len = v.steps?.length || total;
      const steps = [...(v.steps || Array(len).fill(0))];
      const volumes = [...(v.volumes || Array(len).fill(70))];
      const decays = [...(v.decays || Array(len).fill(100))];
      const microtimings = [...(v.microtimings || Array(len).fill(0))];
      for (let k = 0; k < count; k++) {
        const dst = destStart + k, item = clip.steps[k];
        steps[dst] = normAlfaiaStep(item.activeStep, instId) as any;
        volumes[dst] = cloneSculpt(item.volume, 70); decays[dst] = cloneSculpt(item.decay, 100); microtimings[dst] = cloneSculpt(item.microtiming, 0);
      }
      return { ...v, steps, volumes, decays, microtimings };
    });
    return { tracks: updated, pastedIndices };
  }
  const updated = syncPatternAcrossLinkedFamily(tracks, targetTrackId, targetPatternId, (p, _s, t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    const len = p.steps || total;
    const activeSteps = [...(p.activeSteps || Array(len).fill(0))];
    const volumes = [...(p.volumes || Array(len).fill(70))];
    const decays = [...(p.decays || Array(len).fill(100))];
    const microtimings = [...(p.microtimings || Array(len).fill(0))];
    for (let k = 0; k < count; k++) {
      const dst = destStart + k, item = clip.steps[k];
      activeSteps[dst] = normAlfaiaStep(item.activeStep, instId);
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
  const destStart = minIdx + slice.steps.length;
  const res = applyPasteStepRangeState(tracks, slice, trackId, patternId, variationId, destStart);
  if (!res || !res.pastedIndices.length) return null;
  return { tracks: res.tracks, duplicatedIndices: res.pastedIndices };
}
