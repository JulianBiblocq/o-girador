import { instrumentsConfig } from '../../data';
import { Pattern, SavedSectionData, SavedSectionTrack, SongSection, TimeSignature, TrackGroup } from '../../types';
import { resolvePresetAlfaiaEquipment } from '../../utils/alfaiaEquipmentResolver';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { cloneMasterPatternForSlave } from '../../utils/slavePatternCloneHelper';
import { indexTimelineLeafTracks } from '../../utils/sections/sectionImportTrackMatcher';
import { sliceTrackPatternForSection } from '../../utils/sections/sectionPatternSliceHelper';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';

function sliceWithFallback<T>(arr: readonly T[] | undefined, start: number, count: number, fallback: T): T[] {
  return Array.from({ length: count }, (_, i) => {
    const val = arr?.[start + i];
    return val !== undefined ? val : fallback;
  });
}

function normalizePatternForLeafTrack(sourcePattern: Pattern, leafTrack: TrackGroup): Pattern {
  const ownsDirectly = leafTrack.patterns?.some((p) => String(p.id) === String(sourcePattern.id));
  if (ownsDirectly) return sourcePattern;
  const cloned = cloneMasterPatternForSlave(sourcePattern, leafTrack, sourcePattern.measureAssignments || []);
  const instId = instrumentsConfig[leafTrack.instrumentIdx]?.id;
  return normalizePatternStepsForTarget(cloned, instId);
}

export function extractSectionData(section: SongSection, storeState: any): SavedSectionData {
  const start = Math.max(0, section.startMeasure);
  const end = Math.max(start, section.endMeasure);
  const numMeasures = end - start + 1;
  const allTracks: TrackGroup[] = storeState.tracks || [];
  const defaultSig: TimeSignature = storeState.timeSig || '4/4';
  const defaultBpm: number = storeState.bpm || 100;

  const timeSigs = sliceWithFallback<TimeSignature>(storeState.measureTimeSigs, start, numMeasures, defaultSig);
  const bpms = sliceWithFallback<number>(storeState.measureBpms, start, numMeasures, defaultBpm);
  const bpmTransitions = sliceWithFallback<'immediate' | 'ramp' | 'bezier'>(storeState.measureBpmTransitions, start, numMeasures, 'immediate');
  const vols = sliceWithFallback<number>(storeState.measureVols, start, numMeasures, 100);
  const volTransitions = sliceWithFallback<'immediate' | 'ramp' | 'bezier'>(storeState.measureVolTransitions, start, numMeasures, 'immediate');
  const signals = sliceWithFallback<string | null>(storeState.measureSignals, start, numMeasures, null);

  const leafEntries = indexTimelineLeafTracks(allTracks);
  const sectionTracks: SavedSectionTrack[] = [];

  for (const entry of leafEntries) {
    const { track, instrumentId, occurrenceIndex } = entry;
    const resolvedByMeasure = new Map<number, Pattern | null>();
    const uniqueSourcePatterns = new Map<string, Pattern>();

    const getResolvedAt = (m: number): Pattern | null => {
      if (resolvedByMeasure.has(m)) return resolvedByMeasure.get(m)!;
      const raw = resolveActivePattern(track, allTracks, m, false, null) as Pattern | null;
      resolvedByMeasure.set(m, raw);
      return raw;
    };

    const explicitSilenceMeasures: boolean[] = [];
    for (let m = start; m <= end; m++) {
      const ptn = getResolvedAt(m);
      explicitSilenceMeasures.push(ptn === null);
      if (ptn) uniqueSourcePatterns.set(String(ptn.id), ptn);
    }

    if (uniqueSourcePatterns.size === 0) continue;

    const extractedPatterns: Pattern[] = [];
    uniqueSourcePatterns.forEach((srcPtn, key) => {
      const normalized = normalizePatternForLeafTrack(srcPtn, track);
      const sliced = sliceTrackPatternForSection(
        normalized,
        (gm) => {
          const p = getResolvedAt(gm);
          return Boolean(p && String(p.id) === key);
        },
        (gm) => {
          const p = getResolvedAt(gm);
          return p?.measureAllowVariations ? p.measureAllowVariations[gm] !== false : true;
        },
        start,
        end,
        timeSigs[0] || defaultSig
      );
      extractedPatterns.push(...sliced);
    });

    if (extractedPatterns.length === 0) continue;

    sectionTracks.push({
      instrumentId,
      occurrenceIndex,
      instrumentIdx: track.instrumentIdx,
      customName: track.customName,
      tuning: track.tuning,
      isMute: Boolean(track.isMute),
      isSolo: Boolean(track.isSolo),
      volumeVal: track.volumeVal ?? 75,
      reverbVal: track.reverbVal,
      panVal: track.panVal,
      pan: track.pan,
      swingIntensity: track.swingIntensity,
      balancoPresetId: track.balancoPresetId,
      balancoAmount: track.balancoAmount,
      fxSends: track.fxSends ? { ...track.fxSends } : undefined,
      explicitSilenceMeasures,
      patterns: extractedPatterns,
    });
  }

  const childSections = (storeState.songSections || [])
    .filter((s: SongSection) => s.id !== section.id && s.startMeasure >= start && s.endMeasure <= end)
    .map((s: SongSection) => ({
      name: s.name, relativeStart: s.startMeasure - start, relativeEnd: s.endMeasure - start,
      color: s.color, repeatCount: s.repeatCount, level: s.level,
    }));

  const alfaiaEquipment = resolvePresetAlfaiaEquipment({ tracks: sectionTracks }) ?? null;
  return {
    schemaVersion: 2, numMeasures, timeSigs, bpms, bpmTransitions, vols, volTransitions, signals,
    tracks: sectionTracks, alfaiaEquipment, sectionName: section.name, sectionColor: section.color,
    repeatCount: section.repeatCount ?? 1, level: section.level ?? 0, childSections,
  };
}
