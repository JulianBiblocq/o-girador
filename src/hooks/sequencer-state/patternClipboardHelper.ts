import { TrackGroup, Pattern, Language } from '../../types';
import { getNextPatternName } from '../../utils/patternNaming';
import {
  canTransferPatterns,
  getInstrumentFamily,
  resolveTrackInstrumentId,
} from '../../utils/instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { isToadaBus, isToadaChild } from '../../stores/helpers/trackVisibilityHelpers';
import { CopiedPatternClipboard } from '../../stores/slices/clipboardSliceTypes';

export function resolveConcreteTargetTrack(
  tracks: TrackGroup[],
  trackId: number
): TrackGroup | undefined {
  const raw = tracks.find((t) => t.id === trackId || String(t.id) === String(trackId));
  if (!raw) return undefined;
  if (raw.isBusFolder && !raw.isLinkFolder && !isToadaBus(raw)) return undefined;
  if (raw.isLinkFolder) {
    const masterChild = resolveMasterTrack(raw.id, tracks);
    return masterChild && masterChild.id !== raw.id ? masterChild : raw;
  }
  if (isToadaBus(raw) && (!raw.patterns || raw.patterns.length === 0)) {
    return tracks.find((t) => isToadaChild(t, tracks)) || raw;
  }
  return raw;
}

export function buildCopiedPatternPayload(
  pattern: Pattern,
  tracks: TrackGroup[],
  sourceTrackOrInst?: number | string
): CopiedPatternClipboard {
  let resolvedInstId = '';
  let resolvedTrackId: number | undefined;
  if (typeof sourceTrackOrInst === 'string') {
    resolvedInstId = resolveTrackInstrumentId(sourceTrackOrInst, tracks);
  } else if (typeof sourceTrackOrInst === 'number') {
    const tr = resolveConcreteTargetTrack(tracks, sourceTrackOrInst);
    resolvedTrackId = tr?.id;
    resolvedInstId = resolveTrackInstrumentId(tr, tracks);
  }
  if (!resolvedInstId) {
    const owner = tracks.find((t) => !t.isLinkFolder && !t.isBusFolder && t.patterns?.some((p) => p.id === pattern.id))
      || tracks.find((t) => t.patterns?.some((p) => p.id === pattern.id));
    if (owner) {
      resolvedTrackId = owner.id;
      resolvedInstId = resolveTrackInstrumentId(owner, tracks);
    } else {
      resolvedInstId = resolveTrackInstrumentId(pattern, tracks);
    }
  }
  return {
    ...JSON.parse(JSON.stringify(pattern)),
    sourceTrackId: resolvedTrackId,
    sourceInstId: resolvedInstId,
    sourceInstrumentType: resolvedInstId,
    sourceType: resolvedInstId,
    sourceFamily: getInstrumentFamily(resolvedInstId),
  };
}

export function applySinglePatternPasteState(
  tracks: TrackGroup[],
  patternToPaste: CopiedPatternClipboard | null | undefined,
  trackId: number,
  targetPatternId: number | undefined,
  totalMeasures: number,
  lang: Language
): TrackGroup[] | null {
  if (!patternToPaste) return null;
  const targetTrack = resolveConcreteTargetTrack(tracks, trackId);
  if (!targetTrack || !canTransferPatterns(patternToPaste, targetTrack, tracks)) return null;

  const destInstId = resolveTrackInstrumentId(targetTrack, tracks);
  const firstSteps = targetTrack.patterns[0]?.steps || patternToPaste.steps || 16;
  const normalizedSrc = normalizePatternStepsForTarget(
    JSON.parse(JSON.stringify(patternToPaste)),
    destInstId
  );

  const shouldAppendAsNew =
    targetPatternId === undefined ||
    targetPatternId === patternToPaste.id ||
    !targetTrack.patterns.some((p) => p.id === targetPatternId);

  let nextTracks = tracks.map((t) => {
    if (t.id !== targetTrack.id) return t;
    if (shouldAppendAsNew) {
      const pasted: Pattern = {
        ...normalizedSrc,
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: getNextPatternName(t.patterns, patternToPaste.name, lang),
        steps: normalizedSrc.steps,
        activeSteps: [...(normalizedSrc.activeSteps || [])],
        lyrics: [...(normalizedSrc.lyrics || Array(normalizedSrc.steps).fill(''))],
        notes: [...(normalizedSrc.notes || Array(normalizedSrc.steps).fill(''))],
        measureAssignments: Array(totalMeasures).fill(true),
        volumes: normalizedSrc.volumes ? [...normalizedSrc.volumes] : Array(firstSteps).fill(70),
        decays: normalizedSrc.decays ? [...normalizedSrc.decays] : Array(firstSteps).fill(100),
        microtimings: normalizedSrc.microtimings ? [...normalizedSrc.microtimings] : Array(normalizedSrc.steps).fill(0),
      };
      return { ...t, patterns: [...t.patterns, pasted], selectedPatternId: pasted.id };
    }
    const nextPatterns = t.patterns.map((p) => {
      if (p.id !== targetPatternId) return p;
      return {
        ...p,
        steps: normalizedSrc.steps,
        activeSteps: [...(normalizedSrc.activeSteps || [])],
        lyrics: [...(normalizedSrc.lyrics || Array(normalizedSrc.steps).fill(''))],
        notes: [...(normalizedSrc.notes || Array(normalizedSrc.steps).fill(''))],
        volumes: normalizedSrc.volumes ? [...normalizedSrc.volumes] : Array(normalizedSrc.steps).fill(70),
        decays: normalizedSrc.decays ? [...normalizedSrc.decays] : Array(normalizedSrc.steps).fill(100),
        microtimings: normalizedSrc.microtimings ? [...normalizedSrc.microtimings] : Array(normalizedSrc.steps).fill(0),
        beatResolutions: normalizedSrc.beatResolutions ? [...normalizedSrc.beatResolutions] : undefined,
        variations: normalizedSrc.variations,
        preRollActiveSteps: normalizedSrc.preRollActiveSteps,
        preRollLyrics: normalizedSrc.preRollLyrics ? [...normalizedSrc.preRollLyrics] : undefined,
        preRollNotes: normalizedSrc.preRollNotes ? [...normalizedSrc.preRollNotes] : undefined,
        preRollVolumes: normalizedSrc.preRollVolumes ? [...normalizedSrc.preRollVolumes] : undefined,
        preRollDecays: normalizedSrc.preRollDecays ? [...normalizedSrc.preRollDecays] : undefined,
      };
    });
    return { ...t, patterns: nextPatterns };
  });

  if (targetTrack.isLinkMaster === true && !targetTrack.isBusFolder && !targetTrack.isLinkFolder) {
    nextTracks = syncMasterPatternsToLinkedFamily(nextTracks, targetTrack.id).tracks;
  }
  return nextTracks;
}
