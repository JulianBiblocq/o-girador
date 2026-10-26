/**
 * O Girador - Synchronisation et réconciliation Maître -> Esclaves (< 110 lignes).
 */
import { TrackGroup, Pattern } from '../types';
import { getLinkedGroupMembers, resolveMasterTrack } from './trackMasterResolver';

function countOverlap(a?: boolean[], b?: boolean[]): number {
  if (!a || !b) return 0;
  return a.reduce((acc, val, i) => (val && b[i] ? acc + 1 : acc), 0);
}

export function findMatchingSlavePattern(mPtn: Pattern, slave: TrackGroup, master: TrackGroup): Pattern | undefined {
  const slavePatterns = slave.patterns || [];
  const byId = slavePatterns.find((s) => String(s.id) === String(mPtn.id));
  if (byId) return byId;

  const norm = mPtn.name?.trim().toLowerCase();
  const byName = slavePatterns.find((s) => s.name?.trim().toLowerCase() === norm);
  if (!byName) return undefined;

  // Garde anti-piège Princesa Isabel : si byName matche mieux les mesures d'un autre motif du maître
  const otherWithBetterOverlap = (master.patterns || []).find((other) => {
    if (String(other.id) === String(mPtn.id)) return false;
    const ovOther = countOverlap(byName.measureAssignments, other.measureAssignments);
    const ovCur = countOverlap(byName.measureAssignments, mPtn.measureAssignments);
    return ovOther > ovCur && ovOther > 0;
  });

  return otherWithBetterOverlap ? undefined : byName;
}

export function reconcileSlavePatterns(slave: TrackGroup, master: TrackGroup): { patterns: Pattern[]; changed: boolean } {
  let changed = false;
  const masterPatterns = master.patterns || [];
  const oldPatterns = slave.patterns || [];
  if (oldPatterns.length !== masterPatterns.length) changed = true;

  const patterns = masterPatterns.map((mPtn) => {
    const existing = findMatchingSlavePattern(mPtn, slave, master);
    const ov = slave.patternOverrides;
    const copyAssigns = (mPtn.measureAssignments || []).map((asg, m) => ov && ov[m] !== undefined ? (existing?.measureAssignments?.[m] ?? false) : asg);

    if (existing) {
      if (String(existing.id) !== String(mPtn.id) || existing.name !== mPtn.name || existing.steps !== mPtn.steps) changed = true;
      return { ...existing, id: mPtn.id, name: mPtn.name, steps: mPtn.steps, measureAssignments: copyAssigns };
    }

    changed = true;
    return {
      id: mPtn.id, name: mPtn.name, steps: mPtn.steps,
      activeSteps: Array(mPtn.steps).fill(0), lyrics: Array(mPtn.steps).fill(''), notes: Array(mPtn.steps).fill(''),
      volumes: Array(mPtn.steps).fill(80), decays: Array(mPtn.steps).fill(100), microtimings: Array(mPtn.steps).fill(0),
      variations: [], measureAssignments: copyAssigns,
    };
  });

  return { patterns, changed };
}

export function syncMasterPatternsToLinkedFamily(tracks: TrackGroup[], sourceTrackId: number): { tracks: TrackGroup[]; changed: boolean } {
  const master = resolveMasterTrack(sourceTrackId, tracks);
  if (!master || !master.isLinkMaster || master.isBusFolder || master.isLinkFolder) {
    return { tracks, changed: false };
  }

  const slaves = getLinkedGroupMembers(master, tracks).filter((t) => t.id !== master.id);
  const linkFolder = tracks.find((t) => t.isLinkFolder && !t.isBusFolder && (String(t.id) === String(master.linkedToTrackId) || String(t.id) === String(master.busId)));
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
        return { ...t, patterns: slaveRes.patterns, selectedPatternId: validSel ? t.selectedPatternId : (master.selectedPatternId || slaveRes.patterns[0]?.id || 0) };
      }
      return t;
    }
    if (linkFolderIdStr && String(t.id) === linkFolderIdStr && t.isLinkFolder && !t.isBusFolder) {
      const curBp = t.patterns || [];
      const mP = master.patterns || [];
      const isIdentical = curBp.length === mP.length && curBp.every((p, i) => p.id === mP[i].id && p.name === mP[i].name);
      if (!isIdentical) {
        anyChanged = true;
        return { ...t, patterns: mP.map((p) => ({ ...p, measureAssignments: [...(p.measureAssignments || [])] })), selectedPatternId: master.selectedPatternId };
      }
      return t;
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
