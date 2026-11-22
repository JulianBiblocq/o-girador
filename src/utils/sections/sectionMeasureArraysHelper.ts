import { SavedSectionData, SectionImportOptions, SongMarker, SongSection, TimeSignature, TrackGroup } from '../../types';
import { allocSectionEntityId } from './sectionPatternSliceHelper';

function padToLength<T>(arr: readonly T[] | undefined, len: number, fill: T): T[] {
  const out = Array.from({ length: Math.min(len, arr?.length || 0) }, (_, i) => (arr![i] !== undefined ? arr![i] : fill));
  while (out.length < len) out.push(fill);
  return out;
}

function applyRangeArray<T>(
  prev: readonly T[] | undefined,
  baseTotal: number,
  targetM: number,
  insertSpan: number,
  values: readonly T[],
  fallback: T,
  mode: 'insert' | 'overwrite'
): T[] {
  if (mode === 'insert') {
    const paddedBase = padToLength(prev, Math.max(baseTotal, targetM), fallback);
    return [...paddedBase.slice(0, targetM), ...values, ...paddedBase.slice(targetM)];
  }
  const newTotal = Math.max(baseTotal, targetM + insertSpan);
  const out = padToLength(prev, newTotal, fallback);
  for (let i = 0; i < insertSpan; i++) out[targetM + i] = values[i] !== undefined ? values[i] : fallback;
  return out;
}

export function prepareTimelineArraysForSectionImport(
  state: Record<string, any>,
  tracks: TrackGroup[],
  sectionData: SavedSectionData,
  targetM: number,
  options: SectionImportOptions
) {
  const span = Math.max(1, sectionData.numMeasures || 1);
  const baseTotal = Math.max(1, state.totalMeasures || 1);
  const mode = options.mode;
  const newTotalMeasures = mode === 'insert' ? Math.max(baseTotal, targetM) + span : Math.max(baseTotal, targetM + span);

  const defSig: TimeSignature = state.timeSig || '4/4';
  const refIdx = Math.max(0, Math.min(baseTotal - 1, targetM - 1));
  const defBpm: number = state.measureBpms?.[refIdx] || state.bpm || 100;

  const secTimeSigs = Array.from({ length: span }, (_, i) => sectionData.timeSigs?.[i] || defSig);
  const secBpms = Array.from({ length: span }, (_, i) => sectionData.bpms?.[i] ?? defBpm);
  const secBpmTrans = Array.from({ length: span }, (_, i) => sectionData.bpmTransitions?.[i] || 'immediate');
  const secVols = Array.from({ length: span }, (_, i) => sectionData.vols?.[i] ?? 100);
  const secVolTrans = Array.from({ length: span }, (_, i) => sectionData.volTransitions?.[i] || 'immediate');
  const secSignals = Array.from({ length: span }, (_, i) => sectionData.signals?.[i] ?? null);

  const measureTimeSigs = applyRangeArray(state.measureTimeSigs, baseTotal, targetM, span, secTimeSigs, defSig, mode);
  const measureBpms = applyRangeArray(state.measureBpms, baseTotal, targetM, span, secBpms, defBpm, mode);
  const nominalPresetMeasureBpms = state.nominalPresetMeasureBpms
    ? applyRangeArray(state.nominalPresetMeasureBpms, baseTotal, targetM, span, secBpms, defBpm, mode)
    : undefined;
  const measureBpmTransitions = applyRangeArray(state.measureBpmTransitions, baseTotal, targetM, span, secBpmTrans, 'immediate', mode);
  const measureVols = applyRangeArray(state.measureVols, baseTotal, targetM, span, secVols, 100, mode);
  const measureVolTransitions = applyRangeArray(state.measureVolTransitions, baseTotal, targetM, span, secVolTrans, 'immediate', mode);
  const measureSignals = applyRangeArray(state.measureSignals, baseTotal, targetM, span, secSignals, null, mode);

  const preparedTracks: TrackGroup[] = tracks.map((t) => {
    let nextOverrides: Record<number, number | null> | undefined;
    if (t.patternOverrides) {
      nextOverrides = {};
      for (const [k, v] of Object.entries(t.patternOverrides)) {
        const m = Number(k);
        if (!Number.isFinite(m)) continue;
        nextOverrides[mode === 'insert' && m >= targetM ? m + span : m] = v;
      }
    }
    const defTV = t.measureVols?.[refIdx] ?? t.volumeVal ?? 75;
    const defTP = t.measurePans?.[refIdx] ?? t.panVal ?? t.pan ?? 0;
    const defTR = t.measureReverbSends?.[refIdx] ?? t.fxSends?.reverb ?? t.reverbVal ?? 0;
    return {
      ...t,
      patternOverrides: nextOverrides,
      measureVols: t.measureVols ? applyRangeArray(t.measureVols, baseTotal, targetM, span, Array(span).fill(defTV), defTV, mode) : undefined,
      measureVolTransitions: t.measureVolTransitions ? applyRangeArray(t.measureVolTransitions, baseTotal, targetM, span, Array(span).fill('immediate'), 'immediate', mode) : undefined,
      measurePans: t.measurePans ? applyRangeArray(t.measurePans, baseTotal, targetM, span, Array(span).fill(defTP), defTP, mode) : undefined,
      measurePanTransitions: t.measurePanTransitions ? applyRangeArray(t.measurePanTransitions, baseTotal, targetM, span, Array(span).fill('immediate'), 'immediate', mode) : undefined,
      measureReverbSends: t.measureReverbSends ? applyRangeArray(t.measureReverbSends, baseTotal, targetM, span, Array(span).fill(defTR), defTR, mode) : undefined,
      measureReverbTransitions: t.measureReverbTransitions ? applyRangeArray(t.measureReverbTransitions, baseTotal, targetM, span, Array(span).fill('immediate'), 'immediate', mode) : undefined,
      patterns: (t.patterns || []).map((p) => ({
        ...p,
        measureAssignments: applyRangeArray(p.measureAssignments, baseTotal, targetM, span, Array(span).fill(false), false, mode),
        measureAllowVariations: p.measureAllowVariations
          ? applyRangeArray(p.measureAllowVariations, baseTotal, targetM, span, Array(span).fill(true), true, mode)
          : undefined,
      })),
    };
  });

  let nextSections: SongSection[] = (state.songSections || []).flatMap((s: SongSection) => {
    if (mode === 'insert') {
      if (s.startMeasure >= targetM) return [{ ...s, startMeasure: s.startMeasure + span, endMeasure: s.endMeasure + span }];
      if (s.endMeasure >= targetM) return [{ ...s, endMeasure: s.endMeasure + span }];
      return [s];
    }
    const endRange = targetM + span - 1;
    if (s.startMeasure >= targetM && s.endMeasure <= endRange) return [];
    if (s.startMeasure < targetM && s.endMeasure > endRange) return [{ ...s, endMeasure: targetM - 1 }];
    if (s.startMeasure >= targetM && s.startMeasure <= endRange) return [{ ...s, startMeasure: endRange + 1 }];
    if (s.endMeasure >= targetM && s.endMeasure <= endRange) return [{ ...s, endMeasure: targetM - 1 }];
    return [s];
  });

  const bannerName = options.sectionName ?? sectionData.sectionName;
  if (bannerName) {
    nextSections.push({
      id: `sec-${allocSectionEntityId()}`, name: bannerName, startMeasure: targetM, endMeasure: targetM + span - 1,
      color: options.sectionColor ?? sectionData.sectionColor ?? 'var(--cordel-wood)',
      repeatCount: options.repeatCount ?? sectionData.repeatCount ?? 1, level: options.level ?? sectionData.level ?? 0,
    });
  }
  (sectionData.childSections || []).forEach((ch) => {
    nextSections.push({
      id: `sec-${allocSectionEntityId()}`, name: ch.name,
      startMeasure: targetM + ch.relativeStart, endMeasure: targetM + ch.relativeEnd,
      color: ch.color, repeatCount: ch.repeatCount ?? 1, level: ch.level ?? 1,
    });
  });
  nextSections.sort((a, b) => a.startMeasure - b.startMeasure);

  const songMarkers: SongMarker[] = (state.songMarkers || []).map((m: SongMarker) =>
    mode === 'insert' && m.measure >= targetM ? { ...m, measure: m.measure + span } : m
  );
  const loopStartMeasure = mode === 'insert' && state.loopStartMeasure !== null && state.loopStartMeasure >= targetM ? state.loopStartMeasure + span : state.loopStartMeasure;
  const loopEndMeasure = mode === 'insert' && state.loopEndMeasure !== null && state.loopEndMeasure >= targetM ? state.loopEndMeasure + span : state.loopEndMeasure;

  return {
    newTotalMeasures, measureTimeSigs, measureBpms, nominalPresetMeasureBpms,
    measureBpmTransitions, measureVols, measureVolTransitions, measureSignals,
    songSections: nextSections, songMarkers, loopStartMeasure, loopEndMeasure, preparedTracks,
  };
}
