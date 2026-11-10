import { Track, Pattern, GlobalSwing } from '../../types';
import { useBalancoStore } from '../../stores/useBalancoStore';

export interface NoteSwingParams {
  activePattern: Pattern | null;
  liveTrack: Track;
  circleStepIdx: number;
  isTuplet: boolean;
  swingJitter: number;
  globalMode: string;
  globalSwing: GlobalSwing;
  stepDurationSec: number;
}

export function computePercussionNoteSwing(p: NoteSwingParams): number {
  const { activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode, globalSwing, stepDurationSec } = p;
  if (globalMode === 'off') return 0;
  if (isTuplet) return swingJitter;

  const patternPresetId = activePattern?.balancoPresetId;
  const trackPresetId = liveTrack.balancoPresetId;
  const effectivePresetId = patternPresetId || trackPresetId || (globalMode === 'maracatu' ? 'maracatu-trad' : undefined);
  const resolvedPreset = useBalancoStore.getState().resolvePreset(effectivePresetId);

  const trackBalancoAmount = liveTrack.balancoAmount ?? liveTrack.swingIntensity ?? 100;
  const patternBalancoAmount = activePattern?.balancoAmount ?? activePattern?.swingIntensity ?? 100;
  const totalBalancoMultiplier = (trackBalancoAmount / 100) * (patternBalancoAmount / 100);
  const globalIntensity = (globalSwing.swingIntensity ?? 100) / 100;

  let baseSwingOffset = 0;
  const stepPosInGroup = circleStepIdx % 4;
  if (globalMode === 'custom' && !patternPresetId && !trackPresetId) {
    const customOffsetPct = globalSwing.customOffsets[stepPosInGroup] || 0;
    baseSwingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 * globalIntensity;
  } else {
    const offsets = resolvedPreset.offsets;
    const offsetPct = offsets[stepPosInGroup % offsets.length] || 0;
    baseSwingOffset = (offsetPct / 100) * stepDurationSec * 0.5 * globalIntensity;
  }
  return (baseSwingOffset * totalBalancoMultiplier) + swingJitter;
}

export function resolveActivePatternForMeasure(
  liveTrack: Track,
  tracks: Track[],
  measureIdx: number,
  soloId: number | null
): Pattern | null {
  const patterns = liveTrack.patterns;
  if (soloId !== null) {
    const direct = patterns.find((pt) => String(pt.id) === String(soloId));
    if (direct) return direct;
    const soloTrack = tracks.find((t) => t.patterns?.some((pt) => String(pt.id) === String(soloId)));
    const soloPtn = soloTrack?.patterns?.find((pt) => String(pt.id) === String(soloId));
    if (soloPtn) {
      const byName = patterns.find((pt) => pt.name === soloPtn.name);
      if (byName) return byName;
      const sIdx = soloTrack?.patterns?.findIndex((pt) => String(pt.id) === String(soloId));
      if (sIdx !== undefined && sIdx >= 0 && patterns[sIdx]) return patterns[sIdx];
    }
  }
  return patterns.find((pt) => pt.measureAssignments[measureIdx]) || null;
}
