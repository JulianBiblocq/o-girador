/**
 * legacySlaveOverridesMigrator.ts — Migration sans perte des anciens esclaves avec `patternOverrides` (< 128 lignes).
 */
import { Pattern, TrackGroup } from '../types';
import { cloneMasterPatternForSlave, isPatternCompletelySilent } from './slavePatternCloneHelper';
import { findMatchingSlavePattern } from './slavePatternMatcher';
import { syncMasterPatternsToLinkedFamily } from './trackLinkingSync';
import { isSlaveTrack, resolveMasterTrack } from './trackMasterResolver';

const resolveMasterPtn = (master: TrackGroup, folder: TrackGroup | undefined, m: number): Pattern | undefined =>
  master.patterns?.find((p) => Boolean(p.measureAssignments?.[m])) || folder?.patterns?.find((p) => Boolean(p.measureAssignments?.[m]));

const resolveOvPtn = (ovId: number, slave: TrackGroup, master: TrackGroup, folder: TrackGroup | undefined): Pattern | undefined =>
  slave.patterns?.find((p) => String(p.id) === String(ovId))
  || master.patterns?.find((p) => String(p.id) === String(ovId))
  || folder?.patterns?.find((p) => String(p.id) === String(ovId));

export function migrateLegacySlavePatternOverrides(tracks: TrackGroup[], loadedMeasures?: number): TrackGroup[] {
  if (!Array.isArray(tracks) || tracks.length === 0) return tracks;

  let maxM = loadedMeasures && loadedMeasures > 0 ? loadedMeasures : 0;
  for (const t of tracks) {
    for (const p of t.patterns || []) maxM = Math.max(maxM, p.measureAssignments?.length || 0);
    if (t.patternOverrides) {
      for (const k of Object.keys(t.patternOverrides)) {
        const idx = Number(k);
        if (Number.isInteger(idx)) maxM = Math.max(maxM, idx + 1);
      }
    }
  }
  const totalMeasures = Math.max(1, maxM || 4);
  const promotedIds = new Set<number>();

  let migrated = tracks.map((track) => {
    if (!isSlaveTrack(track, tracks)) {
      return track.patternOverrides !== undefined ? { ...track, patternOverrides: undefined } : track;
    }
    const ov = track.patternOverrides;
    if (!ov || Object.keys(ov).length === 0) {
      return track.patternOverrides !== undefined ? { ...track, patternOverrides: undefined } : track;
    }

    const master = resolveMasterTrack(track.id, tracks);
    if (!master || master.id === track.id) {
      return { ...track, isLinkMaster: false, linkedToTrackId: undefined, isHidden: false, patternOverrides: undefined };
    }
    const folder = tracks.find(
      (f) => f.isLinkFolder && (String(f.id) === String(track.linkedToTrackId) || String(f.id) === String(master.linkedToTrackId))
    );

    let diverges = false;
    for (let m = 0; m < totalMeasures; m++) {
      if (!(m in ov) || ov[m] === undefined) continue;
      const mPtn = resolveMasterPtn(master, folder, m);
      if (ov[m] === null) {
        if (mPtn && !isPatternCompletelySilent(mPtn)) { diverges = true; break; }
      } else {
        const ovPtn = resolveOvPtn(ov[m] as number, track, master, folder);
        if (!mPtn) {
          if (ovPtn && !isPatternCompletelySilent(ovPtn)) { diverges = true; break; }
        } else if (!ovPtn || (String(ovPtn.id) !== String(mPtn.id) && JSON.stringify(ovPtn.activeSteps) !== JSON.stringify(mPtn.activeSteps))) {
          diverges = true; break;
        }
      }
    }
    if (!diverges) return { ...track, patternOverrides: undefined };

    promotedIds.add(track.id);
    const poolByKey = new Map<string, Pattern>();
    const chosenKeyByM: (string | null)[] = new Array(totalMeasures).fill(null);
    let nextSynthId = Date.now() + track.id * 100;

    const regPtn = (srcPtn: Pattern, keyHint: string): string => {
      if (poolByKey.has(keyHint)) return keyHint;
      const cloned = cloneMasterPatternForSlave(srcPtn, track, Array(totalMeasures).fill(false));
      if (Array.from(poolByKey.values()).some((p) => p.id === cloned.id)) cloned.id = nextSynthId++;
      poolByKey.set(keyHint, cloned);
      return keyHint;
    };

    for (let m = 0; m < totalMeasures; m++) {
      const ovVal = m in ov ? ov[m] : undefined;
      if (ovVal === null) { chosenKeyByM[m] = null; continue; }
      if (ovVal !== undefined) {
        const ovPtn = resolveOvPtn(ovVal, track, master, folder);
        if (ovPtn) chosenKeyByM[m] = regPtn(ovPtn, `ov_${ovPtn.id}`);
        continue;
      }
      const mPtn = resolveMasterPtn(master, folder, m);
      if (mPtn) {
        const mIdx = (master.patterns || []).indexOf(mPtn);
        chosenKeyByM[m] = regPtn(findMatchingSlavePattern(mPtn, track, master, mIdx >= 0 ? mIdx : 0) || mPtn, `base_${mPtn.id}`);
      }
    }
    if (poolByKey.size === 0 && (track.patterns?.length || 0) > 0) regPtn(track.patterns[0], `fb_${track.patterns[0].id}`);

    const reconstituted = Array.from(poolByKey.entries()).map(([key, ptn]) => ({
      ...ptn, measureAssignments: Array.from({ length: totalMeasures }, (_, m) => chosenKeyByM[m] === key),
    }));
    const firstActive = reconstituted.find((p) => p.measureAssignments.some(Boolean)) || reconstituted[0];
    return {
      ...track, isLinkMaster: false, linkedToTrackId: undefined, isHidden: false,
      patternOverrides: undefined, patterns: reconstituted, selectedPatternId: firstActive?.id ?? 0,
    };
  });

  if (promotedIds.size > 0) {
    migrated = migrated.map((t) => {
      if (t.isLinkFolder) {
        const rem = migrated.filter((c) => !c.isBusFolder && !c.isLinkFolder && !c.isLinkMaster && String(c.linkedToTrackId) === String(t.id));
        if (rem.length === 0) return { ...t, isLinkFolder: false };
      }
      if (t.isLinkMaster && !t.isBusFolder && !t.isLinkFolder) {
        const rem = migrated.filter((c) => c.id !== t.id && isSlaveTrack(c, migrated) && resolveMasterTrack(c.id, migrated)?.id === t.id);
        if (rem.length === 0) return { ...t, isLinkMaster: false, linkedToTrackId: undefined };
      }
      return t;
    });
  }
  const activeMasterIds = migrated.filter((t) => t.isLinkMaster && !t.isBusFolder && !t.isLinkFolder).map((t) => t.id);
  for (const mId of activeMasterIds) migrated = syncMasterPatternsToLinkedFamily(migrated, mId).tracks;
  return migrated;
}
