/**
 * O Girador - Synchronisation et réconciliation Maître -> Esclaves (100 % unisson de partition) (< 110 lignes).
 */
import { TrackGroup, Pattern } from '../types';
import { isSlaveTrack, resolveMasterTrack } from './trackMasterResolver';
import { cloneMasterPatternForSlave, isPatternCompletelySilent } from './slavePatternCloneHelper';
import { boolArraysEqual, numArraysEqual, findMatchingSlavePattern } from './slavePatternMatcher';

export { findMatchingSlavePattern };

export function reconcileSlavePatterns(slave: TrackGroup, master: TrackGroup): { patterns: Pattern[]; changed: boolean } {
  let changed = slave.patternOverrides !== undefined;
  const masterPatterns = master.patterns || [];
  const oldPatterns = slave.patterns || [];

  const patterns = masterPatterns.map((mPtn, mIdx) => {
    const existing = findMatchingSlavePattern(mPtn, slave, master, mIdx);
    const copyAssigns = (mPtn.measureAssignments || []).map(Boolean);

    if (!existing || (isPatternCompletelySilent(existing) && !isPatternCompletelySilent(mPtn))) {
      changed = true;
      return cloneMasterPatternForSlave(mPtn, slave, copyAssigns);
    }

    const nextBeatRes = mPtn.beatResolutions ? [...mPtn.beatResolutions] : existing.beatResolutions;
    const nextAllowVar = mPtn.measureAllowVariations ? [...mPtn.measureAllowVariations] : existing.measureAllowVariations;
    const nextTimeSig = mPtn.timeSignature ?? existing.timeSignature;
    if (
      String(existing.id) !== String(mPtn.id) ||
      existing.name !== mPtn.name ||
      existing.steps !== mPtn.steps ||
      existing.timeSignature !== nextTimeSig ||
      !boolArraysEqual(existing.measureAssignments, copyAssigns) ||
      !boolArraysEqual(existing.measureAllowVariations, nextAllowVar) ||
      !numArraysEqual(existing.beatResolutions, nextBeatRes)
    ) {
      changed = true;
    }

    return {
      ...existing,
      id: mPtn.id,
      name: mPtn.name,
      steps: mPtn.steps,
      ...(nextTimeSig ? { timeSignature: nextTimeSig } : {}),
      ...(nextBeatRes ? { beatResolutions: nextBeatRes } : {}),
      ...(nextAllowVar ? { measureAllowVariations: nextAllowVar } : {}),
      measureAssignments: copyAssigns,
    };
  });

  if (oldPatterns.length !== patterns.length) changed = true;
  return { patterns, changed };
}

export function syncMasterPatternsToLinkedFamily(tracks: TrackGroup[], sourceTrackId: number): { tracks: TrackGroup[]; changed: boolean } {
  const master = resolveMasterTrack(sourceTrackId, tracks);
  if (!master || !master.isLinkMaster || master.isBusFolder || master.isLinkFolder) {
    return { tracks, changed: false };
  }

  const slaves = tracks.filter((t) => t.id !== master.id && isSlaveTrack(t, tracks) && resolveMasterTrack(t.id, tracks)?.id === master.id);
  const linkFolder = tracks.find((t) => t.isLinkFolder && (String(t.id) === String(master.linkedToTrackId) || String(t.id) === String(master.busId)));
  if (slaves.length === 0 && !linkFolder) return { tracks, changed: false };

  let anyChanged = false;
  const slaveMap = new Map(slaves.map((s) => [s.id, reconcileSlavePatterns(s, master)]));
  const linkFolderIdStr = linkFolder ? String(linkFolder.id) : null;

  const nextTracks = tracks.map((t) => {
    const slaveRes = slaveMap.get(t.id);
    if (slaveRes) {
      if (slaveRes.changed) {
        anyChanged = true;
        const validSel = slaveRes.patterns.some((p) => p.id === t.selectedPatternId);
        return {
          ...t,
          patternOverrides: undefined,
          patterns: slaveRes.patterns,
          selectedPatternId: validSel ? t.selectedPatternId : (master.selectedPatternId || slaveRes.patterns[0]?.id || 0),
        };
      }
      return t;
    }
    if (linkFolderIdStr && String(t.id) === linkFolderIdStr && t.isLinkFolder) {
      const curBp = t.patterns || [], mP = master.patterns || [];
      const isIdentical = curBp.length === mP.length && curBp.every((p, i) => p.id === mP[i].id && p.name === mP[i].name && boolArraysEqual(p.measureAssignments, mP[i].measureAssignments));
      if (!isIdentical) {
        anyChanged = true;
        return { ...t, patterns: mP.map((p) => ({ ...p, measureAssignments: [...(p.measureAssignments || [])] })), selectedPatternId: master.selectedPatternId };
      }
    }
    return t;
  });

  return { tracks: anyChanged ? nextTracks : tracks, changed: anyChanged };
}

export function reconcileAllLinkedTracks(tracks: TrackGroup[]): { tracks: TrackGroup[]; changed: boolean } {
  let currentTracks = tracks;
  let overallChanged = false;
  for (const m of tracks.filter((t) => t.isLinkMaster && !t.isBusFolder && !t.isLinkFolder)) {
    const res = syncMasterPatternsToLinkedFamily(currentTracks, m.id);
    if (res.changed) { overallChanged = true; currentTracks = res.tracks; }
  }
  return { tracks: overallChanged ? currentTracks : tracks, changed: overallChanged };
}
