import { instrumentsConfig } from '../../../data';
import { Pattern, SongMarker, SongSection, TrackGroup } from '../../../types';
import { getInstrumentPrimaryStrongColor, getTrackDisplayName } from '../../../utils/colorHelpers';
import { isSlaveTrack, resolveMasterTrack, resolveMatchingPatternIdOnMaster } from '../../../utils/trackMasterResolver';
import { getDefaultStepsForMeasure, resolvePatternForMeasure } from '../../circle-sequencer/measurePatternHelpers';
import { sortTracksByRodaOrder } from '../../circle-sequencer/sortTracksByRodaOrder';
import { RodaSheetMeasureItem, RodaSheetSelectionMode, RodaSheetTrackInfo } from './rodaSheetTypes';

export function getEligibleRodaSheetTracks(allTracks: TrackGroup[], rodaTrackOrder: number[]): RodaSheetTrackInfo[] {
  const drawable = allTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder || t.instrumentIdx === undefined) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst || inst.type === 'voice') return false;
    const idLower = (inst.id || '').toLowerCase();
    const nameLower = (t.customName || inst.name || '').toLowerCase();
    return idLower !== 'apito' && !nameLower.includes('apito');
  });
  return sortTracksByRodaOrder(drawable, rodaTrackOrder).map((track, idx) => {
    const inst = instrumentsConfig[track.instrumentIdx] || instrumentsConfig[0];
    return {
      track, inst, displayIndex: idx + 1,
      displayName: getTrackDisplayName(track as any, allTracks as any),
      color: getInstrumentPrimaryStrongColor(inst, track),
    };
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
  const visible = eligible.filter((e) => !e.track.isHidden).map((e) => e.track.id);
  return visible.length > 0 ? visible : eligible.map((e) => e.track.id);
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

function resolveTrackStepsAtMeasure(track: TrackGroup, allTracks: TrackGroup[], mIdx: number, stepCount: number): any[] {
  const ptn = resolveEffectivePatternAtMeasure(track, allTracks, mIdx);
  if (!ptn || !ptn.activeSteps) return Array(stepCount).fill(0);

  let relIdx = 0;
  for (let prev = mIdx - 1; prev >= 0; prev--) {
    const prevPtn = resolveEffectivePatternAtMeasure(track, allTracks, prev);
    if (prevPtn && prevPtn.id === ptn.id) relIdx++;
    else break;
  }
  const spanMeasures = Math.max(1, Math.round((ptn.steps || 16) / 16));
  const startStep = (relIdx % spanMeasures) * stepCount;
  const sliced = ptn.activeSteps.slice(startStep, startStep + stepCount);
  while (sliced.length < stepCount) sliced.push(0);
  return sliced;
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
    const stepCount = getDefaultStepsForMeasure(mIdx, defaultTimeSig, measureTimeSigs);
    const stepsByTrackId: Record<number, any[]> = {};
    const fpParts: string[] = [timeSig];
    for (const info of selectedTracks) {
      const steps = resolveTrackStepsAtMeasure(info.track, allTracks, mIdx, stepCount);
      stepsByTrackId[info.track.id] = steps;
      fpParts.push(`${info.track.id}:${JSON.stringify(steps)}`);
    }
    return {
      key: `m-${mIdx}`, startMeasure: mIdx, endMeasure: mIdx, repeatCount: 1,
      label: `M.${mIdx + 1}`, multiplierLabel: null,
      sectionName: resolveMeasureSectionLabel(mIdx, songMarkers, songSections),
      timeSig, stepCount, stepsByTrackId, fingerprint: fpParts.join('|'),
    };
  };

  if (selectionMode === 'custom') {
    return [...customMeasures].filter((m) => m >= 0 && m < totalMeasures).sort((a, b) => a - b).map(buildSingle);
  }

  const grouped: Array<RodaSheetMeasureItem & { fingerprint: string }> = [];
  for (let m = 0; m < totalMeasures; m++) {
    const cur = buildSingle(m);
    const prev = grouped[grouped.length - 1];
    if (prev && prev.fingerprint === cur.fingerprint && (prev.sectionName || '') === (cur.sectionName || '')) {
      prev.endMeasure = m;
      prev.repeatCount += 1;
      prev.label = `M.${prev.startMeasure + 1}–${m + 1}`;
      prev.multiplierLabel = `×${prev.repeatCount}`;
      prev.key = `m-${prev.startMeasure}-${m}`;
    } else {
      grouped.push(cur);
    }
  }
  return grouped;
}
