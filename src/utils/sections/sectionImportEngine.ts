import { applyRadii } from '../../stores/helpers/trackRodaGeometryHelpers';
import { Pattern, SavedSectionData, SectionImportOptions, TrackGroup } from '../../types';
import { isSlaveTrack } from '../trackMasterResolver';
import { indexTimelineLeafTracks, instantiateMissingSectionTrack, resolveSavedTrackIdentity } from './sectionImportTrackMatcher';
import { prepareTimelineArraysForSectionImport } from './sectionMeasureArraysHelper';
import { injectSavedPatternsIntoTrack, reconcileImportedSlaveOverrides } from './sectionTrackPatternInjector';

export interface SectionImportResult {
  blockedByLimit: boolean;
  maxMeasuresAllowed?: number;
  patch: Record<string, any> | null;
}

export function applySectionImportToState(
  state: Record<string, any>,
  sectionData: SavedSectionData,
  targetMeasure: number,
  rawOptions?: Partial<SectionImportOptions>
): SectionImportResult {
  const options: SectionImportOptions = { mode: 'insert', createMissingTracks: true, ...rawOptions };
  const targetM = Math.max(0, targetMeasure);
  const span = Math.max(1, sectionData.numMeasures || 1);
  const baseTotal = Math.max(1, state.totalMeasures || 1);
  const proposedTotal = options.mode === 'insert' ? Math.max(baseTotal, targetM) + span : Math.max(baseTotal, targetM + span);

  if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && state.maxMeasuresAllowed !== undefined && proposedTotal > state.maxMeasuresAllowed) {
    return { blockedByLimit: true, maxMeasuresAllowed: state.maxMeasuresAllowed, patch: null };
  }

  const seedTracks: TrackGroup[] = (state.tracks || []).map((t: TrackGroup) => ({ ...t, patterns: [...(t.patterns || [])] }));
  const nextRodaOrder: number[] = Array.isArray(state.rodaTrackOrder) ? [...state.rodaTrackOrder] : [];

  const savedCounts = new Map<string, number>();
  const normalizedSaved = (sectionData.tracks || [])
    .filter((st) => !(st as any).isBusFolder && !(st as any).isLinkFolder)
    .map((st) => {
      const { instrumentId } = resolveSavedTrackIdentity(st);
      const autoOcc = savedCounts.get(instrumentId) ?? 0;
      savedCounts.set(instrumentId, autoOcc + 1);
      return { st, instrumentId, occ: st.occurrenceIndex !== undefined ? st.occurrenceIndex : autoOcc };
    });

  if (options.createMissingTracks) {
    for (const item of normalizedSaved) {
      const curLeaf = indexTimelineLeafTracks(seedTracks);
      if (!curLeaf.some((lt) => lt.instrumentId === item.instrumentId && lt.occurrenceIndex === item.occ)) {
        const created = instantiateMissingSectionTrack(seedTracks, item.st);
        if (nextRodaOrder.length > 0 && !nextRodaOrder.includes(created.id)) nextRodaOrder.push(created.id);
      }
    }
  }

  const arrays = prepareTimelineArraysForSectionImport(state, seedTracks, sectionData, targetM, options);
  const workingTracks = arrays.preparedTracks;
  const leafIndex = indexTimelineLeafTracks(workingTracks);
  const matchedTrackIds = new Set<number>();
  const activeBarMapByTrackId = new Map<number, Map<number, Pattern>>();

  const matchedPairs = normalizedSaved
    .map((item) => ({ item, leaf: leafIndex.find((lt) => lt.instrumentId === item.instrumentId && lt.occurrenceIndex === item.occ) }))
    .filter((x): x is { item: typeof normalizedSaved[number]; leaf: NonNullable<typeof x.leaf> } => Boolean(x.leaf))
    .sort((a, b) => (isSlaveTrack(a.leaf.track, workingTracks) ? 1 : 0) - (isSlaveTrack(b.leaf.track, workingTracks) ? 1 : 0));

  for (const { item, leaf } of matchedPairs) {
    const trk = workingTracks[leaf.trackArrayIdx];
    matchedTrackIds.add(trk.id);
    if (trk.patternOverrides) {
      for (let m = targetM; m < targetM + span; m++) delete trk.patternOverrides[m];
      if (Object.keys(trk.patternOverrides).length === 0) trk.patternOverrides = undefined;
    }
    const barMap = injectSavedPatternsIntoTrack(trk, item.st, targetM, span, arrays.newTotalMeasures);
    activeBarMapByTrackId.set(trk.id, barMap);
  }

  reconcileImportedSlaveOverrides(workingTracks, leafIndex, matchedTrackIds, activeBarMapByTrackId, targetM, span);

  for (let i = 0; i < workingTracks.length; i++) {
    const folder = workingTracks[i];
    if (!folder.isLinkFolder) continue;
    const masterChild = workingTracks.find(
      (c) => !c.isBusFolder && !c.isLinkFolder && c.isLinkMaster && (String(c.linkedToTrackId) === String(folder.id) || String(c.busId) === String(folder.id))
    );
    if (masterChild) {
      workingTracks[i] = { ...folder, patterns: JSON.parse(JSON.stringify(masterChild.patterns)), selectedPatternId: masterChild.selectedPatternId };
    }
  }

  return {
    blockedByLimit: false,
    patch: {
      totalMeasures: arrays.newTotalMeasures,
      measureTimeSigs: arrays.measureTimeSigs,
      measureBpms: arrays.measureBpms,
      ...(arrays.nominalPresetMeasureBpms ? { nominalPresetMeasureBpms: arrays.nominalPresetMeasureBpms } : {}),
      measureBpmTransitions: arrays.measureBpmTransitions,
      measureVols: arrays.measureVols,
      measureVolTransitions: arrays.measureVolTransitions,
      measureSignals: arrays.measureSignals,
      songSections: arrays.songSections,
      songMarkers: arrays.songMarkers,
      loopStartMeasure: arrays.loopStartMeasure,
      loopEndMeasure: arrays.loopEndMeasure,
      ...(nextRodaOrder.length > 0 ? { rodaTrackOrder: nextRodaOrder } : {}),
      tracks: applyRadii(workingTracks, nextRodaOrder.length > 0 ? nextRodaOrder : state.rodaTrackOrder),
      tracksVersion: (state.tracksVersion || 0) + 1,
    },
  };
}
