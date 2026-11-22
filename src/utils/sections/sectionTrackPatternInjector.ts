import { instrumentsConfig } from '../../data';
import { Pattern, SavedSectionTrack, TrackGroup } from '../../types';
import { normalizePatternStepsForTarget } from '../patternPasteNormalizer';
import { cloneMasterPatternForSlave } from '../slavePatternCloneHelper';
import { isSlaveTrack, resolveMasterTrack } from '../trackMasterResolver';
import { IndexedLeafTrack } from './sectionImportTrackMatcher';
import { allocSectionEntityId, areSectionPatternsEquivalent } from './sectionPatternSliceHelper';

export function injectSavedPatternsIntoTrack(
  track: TrackGroup,
  savedTrack: SavedSectionTrack,
  targetM: number,
  span: number,
  newTotal: number
): Map<number, Pattern> {
  const instId = instrumentsConfig[track.instrumentIdx]?.id;
  const activeByBar = new Map<number, Pattern>();
  const nextPatterns = [...(track.patterns || [])];

  for (const rawLoaded of savedTrack.patterns || []) {
    const normalized = normalizePatternStepsForTarget(JSON.parse(JSON.stringify(rawLoaded)), instId);
    const existingIdx = nextPatterns.findIndex((ep) => areSectionPatternsEquivalent(ep, normalized));
    let targetPtn: Pattern;

    if (existingIdx >= 0) {
      const existing = nextPatterns[existingIdx];
      const nextAssign = [...(existing.measureAssignments || Array(newTotal).fill(false))];
      while (nextAssign.length < newTotal) nextAssign.push(false);
      const hasVarDice = Boolean(existing.measureAllowVariations || normalized.measureAllowVariations);
      const nextAllow = hasVarDice ? [...(existing.measureAllowVariations || Array(newTotal).fill(true))] : undefined;
      if (nextAllow) while (nextAllow.length < newTotal) nextAllow.push(true);

      for (let r = 0; r < span; r++) {
        if (normalized.measureAssignments?.[r]) {
          nextAssign[targetM + r] = true;
          if (nextAllow) nextAllow[targetM + r] = normalized.measureAllowVariations ? normalized.measureAllowVariations[r] !== false : true;
        }
      }
      targetPtn = { ...existing, measureAssignments: nextAssign, ...(nextAllow ? { measureAllowVariations: nextAllow } : {}) };
      nextPatterns[existingIdx] = targetPtn;
    } else {
      const nextAssign = Array(newTotal).fill(false);
      const nextAllow = normalized.measureAllowVariations ? Array(newTotal).fill(true) : undefined;
      for (let r = 0; r < span; r++) {
        if (normalized.measureAssignments?.[r]) {
          nextAssign[targetM + r] = true;
          if (nextAllow) nextAllow[targetM + r] = normalized.measureAllowVariations![r] !== false;
        }
      }
      targetPtn = { ...normalized, id: allocSectionEntityId(), measureAssignments: nextAssign, ...(nextAllow ? { measureAllowVariations: nextAllow } : {}) };
      nextPatterns.push(targetPtn);
    }

    for (let r = 0; r < span; r++) {
      if (normalized.measureAssignments?.[r]) activeByBar.set(targetM + r, targetPtn);
    }
  }

  track.patterns = nextPatterns;
  if (!track.patterns.some((p) => p.id === track.selectedPatternId)) {
    track.selectedPatternId = track.patterns[0]?.id ?? 0;
  }
  return activeByBar;
}

export function reconcileImportedSlaveOverrides(
  workingTracks: TrackGroup[],
  leafIndex: readonly IndexedLeafTrack[],
  matchedTrackIds: ReadonlySet<number>,
  activeBarMapByTrackId: ReadonlyMap<number, Map<number, Pattern>>,
  targetM: number,
  span: number
): void {
  for (const lf of leafIndex) {
    const trk = workingTracks[lf.trackArrayIdx];
    if (!isSlaveTrack(trk, workingTracks)) continue;
    const master = resolveMasterTrack(trk.id, workingTracks);
    if (!master) continue;
    const masterBars = activeBarMapByTrackId.get(master.id);
    const slaveBars = activeBarMapByTrackId.get(trk.id);
    const overrides: Record<number, number | null> = { ...(trk.patternOverrides || {}) };

    for (let m = targetM; m < targetM + span; m++) {
      const mPtn = masterBars?.get(m) ?? master.patterns.find((p) => p.measureAssignments?.[m]) ?? null;
      if (!matchedTrackIds.has(trk.id)) {
        if (mPtn) overrides[m] = null;
        else delete overrides[m];
        continue;
      }
      const sPtn = slaveBars?.get(m) ?? null;
      if (!sPtn && mPtn) overrides[m] = null;
      else if (sPtn && !mPtn) overrides[m] = sPtn.id;
      else if (sPtn && mPtn) {
        const expectedTwin = cloneMasterPatternForSlave(mPtn, trk, mPtn.measureAssignments);
        if (areSectionPatternsEquivalent({ ...expectedTwin, name: sPtn.name }, sPtn)) delete overrides[m];
        else overrides[m] = sPtn.id;
      } else delete overrides[m];
    }
    trk.patternOverrides = Object.keys(overrides).length > 0 ? overrides : undefined;
  }
}
