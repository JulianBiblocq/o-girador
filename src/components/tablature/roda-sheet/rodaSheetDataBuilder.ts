import { instrumentsConfig } from '../../../data';
import { Pattern, SongMarker, SongSection, TrackGroup } from '../../../types';
import { getInstrumentPrimaryStrongColor, getTrackDisplayName } from '../../../utils/colorHelpers';
import { computeMeasurePatternStepOffset, computeRodaStepAngles, getRodaMeasureGeometry, resolveActiveBeatResolutions } from '../../../utils/rodaTimeSigGeometry';
import { isSlaveTrack, resolveMasterTrack, resolveMatchingPatternIdOnMaster } from '../../../utils/trackMasterResolver';
import { resolvePatternForMeasure } from '../../circle-sequencer/measurePatternHelpers';
import { sortTracksByRodaOrder } from '../../circle-sequencer/sortTracksByRodaOrder';
import { RodaSheetMeasureItem, RodaSheetSelectionMode, RodaSheetTrackInfo } from './rodaSheetTypes';

export function formatCompactMeasuresLabel(measureIndices: number[]): string {
  if (measureIndices.length === 0) return 'M.1';
  const sorted = [...measureIndices].sort((a, b) => a - b), runs: string[] = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) end = sorted[i];
    else { runs.push(start === end ? `${start + 1}` : `${start + 1}–${end + 1}`); start = end = sorted[i]; }
  }
  runs.push(start === end ? `${start + 1}` : `${start + 1}–${end + 1}`);
  return `M.${runs.join(', ')}`;
}

export function getEligibleRodaSheetTracks(allTracks: TrackGroup[], rodaTrackOrder: number[]): RodaSheetTrackInfo[] {
  const drawable = allTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder || t.instrumentIdx === undefined) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst || inst.type === 'voice') return false;
    const idLower = (inst.id || '').toLowerCase(), nameLower = (t.customName || inst.name || '').toLowerCase();
    return idLower !== 'apito' && !nameLower.includes('apito');
  });
  return sortTracksByRodaOrder(drawable, rodaTrackOrder).map((track, idx) => {
    const inst = instrumentsConfig[track.instrumentIdx] || instrumentsConfig[0];
    return { track, inst, displayIndex: idx + 1, displayName: getTrackDisplayName(track as any, allTracks as any), color: getInstrumentPrimaryStrongColor(inst, track) };
  });
}

export function getDefaultSelectedRodaTrackIds(
  eligible: RodaSheetTrackInfo[], isFocusActive: boolean, focusTrackId: number | null, referenceTrackId: number | null
): number[] {
  if (isFocusActive && focusTrackId !== null) {
    const focusSet = new Set<number>([focusTrackId, ...(referenceTrackId !== null ? [referenceTrackId] : [])]);
    const matching = eligible.filter((e) => focusSet.has(e.track.id)).map((e) => e.track.id);
    if (matching.length > 0) return matching;
  }
  return eligible.map((e) => e.track.id);
}

function resolveEffectivePatternAtMeasure(track: TrackGroup, allTracks: TrackGroup[], m: number): Pattern | null {
  const own = resolvePatternForMeasure(track, m, null);
  if (own) return own;
  if (isSlaveTrack(track, allTracks) && track.patternOverrides?.[m] === undefined) {
    const master = resolveMasterTrack(track.id, allTracks);
    if (master && master.id !== track.id) {
      const masterPtn = resolvePatternForMeasure(master, m, null);
      if (masterPtn) {
        const matchId = resolveMatchingPatternIdOnMaster(track, master, masterPtn.id);
        return track.patterns.find((p) => p.id === matchId) || masterPtn;
      }
    }
  }
  return null;
}

function resolveTrackStepsAtMeasure(track: TrackGroup, allTracks: TrackGroup[], mIdx: number, timeSig: string): { steps: any[]; angles: number[] } {
  const ptn = resolveEffectivePatternAtMeasure(track, allTracks, mIdx);
  const angles = computeRodaStepAngles(timeSig, resolveActiveBeatResolutions(timeSig, ptn));
  const stepCount = angles.length;
  if (!ptn || !ptn.activeSteps) return { steps: Array(stepCount).fill(0), angles };
  let relIdx = 0;
  for (let prev = mIdx - 1; prev >= 0; prev--) {
    const prevPtn = resolveEffectivePatternAtMeasure(track, allTracks, prev);
    if (prevPtn && prevPtn.id === ptn.id) relIdx++; else break;
  }
  let effectiveSteps = ptn.activeSteps;
  if (ptn.variations && ptn.variations.length > 0) {
    const firstPassVar = relIdx === 0 ? ptn.variations.find((v) => v.playFirstTimeOnly && v.steps?.length) : undefined;
    if (firstPassVar) effectiveSteps = firstPassVar.steps;
    else if (ptn.measureAllowVariations?.[mIdx] === true) {
      const detVar = ptn.variations.find((v) => !v.playFirstTimeOnly && (v.probability ?? 0) >= 100 && v.steps?.length);
      if (detVar) effectiveSteps = detVar.steps;
    }
  }
  const startStep = computeMeasurePatternStepOffset(ptn, stepCount, mIdx);
  const sliced = effectiveSteps.slice(startStep, startStep + stepCount);
  while (sliced.length < stepCount) sliced.push(0);
  return { steps: sliced, angles };
}

function resolveMeasureSectionLabel(mIdx: number, songMarkers: SongMarker[] = [], songSections: SongSection[] = []): string | null {
  const marker = songMarkers.find((mk) => mk.measure === mIdx);
  if (marker?.name) return marker.name.replace(/\s+/g, ' ').trim();
  const sec = songSections.find((s) => mIdx >= s.startMeasure && mIdx <= s.endMeasure);
  return sec?.name ? sec.name.trim() : null;
}

export function buildRodaSheetMeasureItems(params: {
  totalMeasures: number; selectedTracks: RodaSheetTrackInfo[]; allTracks: TrackGroup[];
  selectionMode: RodaSheetSelectionMode; customMeasures: number[]; defaultTimeSig: string;
  measureTimeSigs?: Record<number, string>; songMarkers?: SongMarker[]; songSections?: SongSection[];
}): RodaSheetMeasureItem[] {
  const { totalMeasures, selectedTracks, allTracks, selectionMode, customMeasures, defaultTimeSig, measureTimeSigs, songMarkers, songSections } = params;
  const buildSingle = (mIdx: number): RodaSheetMeasureItem & { fingerprint: string } => {
    const timeSig = measureTimeSigs?.[mIdx] || defaultTimeSig || '4/4';
    const stepCount = getRodaMeasureGeometry(timeSig).defaultSteps;
    const stepsByTrackId: Record<number, any[]> = {}, stepAnglesByTrackId: Record<number, number[]> = {}, fpParts: string[] = [timeSig];
    for (const info of selectedTracks) {
      const { steps, angles } = resolveTrackStepsAtMeasure(info.track, allTracks, mIdx, timeSig);
      stepsByTrackId[info.track.id] = steps; stepAnglesByTrackId[info.track.id] = angles;
      fpParts.push(`${info.track.id}:${JSON.stringify(steps)}`);
    }
    return {
      key: `m-${mIdx}`, startMeasure: mIdx, endMeasure: mIdx, measureIndices: [mIdx], repeatCount: 1,
      label: `M.${mIdx + 1}`, multiplierLabel: null, sectionName: resolveMeasureSectionLabel(mIdx, songMarkers, songSections),
      timeSig, stepCount, stepsByTrackId, stepAnglesByTrackId, fingerprint: fpParts.join('|'),
    };
  };
  if (selectionMode === 'custom') return [...customMeasures].filter((m) => m >= 0 && m < totalMeasures).sort((a, b) => a - b).map(buildSingle);
  const grouped: Array<RodaSheetMeasureItem & { fingerprint: string }> = [];
  for (let m = 0; m < totalMeasures; m++) {
    const cur = buildSingle(m), existing = grouped.find((g) => g.fingerprint === cur.fingerprint);
    if (existing) {
      existing.measureIndices.push(m); existing.endMeasure = m; existing.repeatCount = existing.measureIndices.length;
      existing.label = formatCompactMeasuresLabel(existing.measureIndices); existing.multiplierLabel = `×${existing.repeatCount}`;
    } else grouped.push(cur);
  }
  return grouped;
}
