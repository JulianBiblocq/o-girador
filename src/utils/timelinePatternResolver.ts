import { Pattern } from '../types';
import { instrumentsConfig } from '../data';
import { isToadaBus } from '../stores/useSequencerStore';
import { getNextPatternName } from './patternNaming';
import { syncMasterPatternsToLinkedFamily } from './trackLinkingSync';
import { isSlaveTrack, resolveMasterTrack } from './trackMasterResolver';

export interface ResolvedCellPattern {
  activePattern: Pattern | null;
  ownerTrack: any | null;
}

export function resolvePatternsListForTrack(targetTrack: any, tracks: any[]): Pattern[] {
  if (!targetTrack) return [];
  if (isToadaBus(targetTrack)) {
    const pux = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    return [...(pux?.patterns || []), ...(coro?.patterns || [])];
  }
  if (isSlaveTrack(targetTrack, tracks)) {
    const master = resolveMasterTrack(targetTrack.id, tracks);
    if (master?.patterns && master.patterns.length > 0) return master.patterns;
    const parentBus = targetTrack.linkedToTrackId ? tracks.find((t) => String(t.id) === String(targetTrack.linkedToTrackId) && t.isLinkFolder) : null;
    if (parentBus?.patterns && parentBus.patterns.length > 0) return parentBus.patterns;
    return targetTrack.patterns || [];
  }
  return targetTrack.patterns || [];
}

export function resolveActivePatternForCell(
  trackId: number, measureIdx: number, patternId: number | null, tracks: any[]
): ResolvedCellPattern {
  const targetTrack = tracks.find((t) => t.id === trackId);
  if (!targetTrack) return { activePattern: null, ownerTrack: null };

  if (isToadaBus(targetTrack)) {
    const pux = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
    const coro = tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro');
    if (patternId !== null) {
      const p = pux?.patterns.find((pt: Pattern) => pt.id === patternId);
      if (p) return { activePattern: p, ownerTrack: pux };
      const c = coro?.patterns.find((pt: Pattern) => pt.id === patternId);
      if (c) return { activePattern: c, ownerTrack: coro };
    }
    const pAssigned = pux?.patterns.find((pt: Pattern) => Boolean(pt.measureAssignments?.[measureIdx]));
    if (pAssigned) return { activePattern: pAssigned, ownerTrack: pux };
    const cAssigned = coro?.patterns.find((pt: Pattern) => Boolean(pt.measureAssignments?.[measureIdx]));
    if (cAssigned) return { activePattern: cAssigned, ownerTrack: coro };
    return { activePattern: null, ownerTrack: pux || coro || targetTrack };
  }

  if (patternId === null && targetTrack.patternOverrides?.[measureIdx] !== undefined) {
    const ov = targetTrack.patternOverrides[measureIdx];
    if (ov === null) return { activePattern: null, ownerTrack: targetTrack };
    const ownOv = targetTrack.patterns?.find((p: Pattern) => String(p.id) === String(ov));
    if (ownOv) return { activePattern: ownOv, ownerTrack: targetTrack };
    for (const tr of tracks) {
      const extOv = tr?.patterns?.find((p: Pattern) => String(p.id) === String(ov));
      if (extOv) return { activePattern: extOv, ownerTrack: tr };
    }
    return { activePattern: null, ownerTrack: targetTrack };
  }

  if (isSlaveTrack(targetTrack, tracks)) {
    const master = resolveMasterTrack(targetTrack.id, tracks);
    const parentBus = targetTrack.linkedToTrackId ? tracks.find((t) => String(t.id) === String(targetTrack.linkedToTrackId) && t.isLinkFolder) : null;
    const masterPtn = master?.patterns?.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx]))
      || parentBus?.patterns?.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx]));
    if (!masterPtn) return { activePattern: null, ownerTrack: master || targetTrack };

    const ownById = targetTrack.patterns?.find((p: Pattern) => String(p.id) === String(masterPtn.id));
    if (ownById) return { activePattern: ownById, ownerTrack: master || targetTrack };
    const norm = masterPtn.name?.trim().toLowerCase();
    const matchByName = targetTrack.patterns?.find((p: Pattern) => p.name?.trim().toLowerCase() === norm);
    if (matchByName) return { activePattern: matchByName, ownerTrack: master || targetTrack };
    return { activePattern: masterPtn, ownerTrack: master || parentBus || targetTrack };
  }

  if (patternId !== null) {
    const ptn = targetTrack.patterns?.find((p: Pattern) => p.id === patternId);
    if (ptn) return { activePattern: ptn, ownerTrack: targetTrack };
  }
  const assigned = targetTrack.patterns?.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx])) || null;
  if (assigned) return { activePattern: assigned, ownerTrack: targetTrack };

  if (targetTrack.linkedToTrackId) {
    const bus = tracks.find((t) => String(t.id) === String(targetTrack.linkedToTrackId) && t.isLinkFolder);
    const busPtn = bus?.patterns?.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx]));
    if (busPtn) {
      const match = targetTrack.patterns?.find((p: Pattern) => p.id === busPtn.id || p.name?.trim().toLowerCase() === busPtn.name?.trim().toLowerCase());
      if (match) return { activePattern: match, ownerTrack: targetTrack };
    }
  }
  return { activePattern: null, ownerTrack: targetTrack };
}

export function cloneAndIsolatePatternOnMeasure(
  ownerTrack: any, targetTrack: any, activePattern: Pattern, measureIdx: number,
  totalMeasures: number, lang: string, allTracks: any[]
): { updatedTracks: any[]; newPatternId: number } {
  const effMaster = isSlaveTrack(targetTrack, allTracks) ? (resolveMasterTrack(targetTrack.id, allTracks) || ownerTrack) : ownerTrack;
  const newPatternId = Date.now() + Math.floor(Math.random() * 1000);
  const newPatternName = getNextPatternName(effMaster.patterns, activePattern.name, lang);
  const clonedPattern: Pattern = {
    ...JSON.parse(JSON.stringify(activePattern)),
    id: newPatternId, name: newPatternName,
    measureAssignments: Array(totalMeasures).fill(false),
    measureAllowVariations: activePattern.measureAllowVariations ? Array(totalMeasures).fill(true) : undefined,
  };
  clonedPattern.measureAssignments[measureIdx] = true;

  let updatedTracks = allTracks.map((t) => {
    if (t.id === effMaster.id) {
      const nextAssignmentsList = t.patterns.map((p: Pattern) => {
        const nextAssignments = [...(p.measureAssignments || [])];
        while (nextAssignments.length <= measureIdx) nextAssignments.push(false);
        nextAssignments[measureIdx] = false;
        return { ...p, measureAssignments: nextAssignments };
      });
      return { ...t, patternOverrides: undefined, patterns: [...nextAssignmentsList, clonedPattern], selectedPatternId: newPatternId };
    }
    return t;
  });

  if (effMaster.isLinkMaster) updatedTracks = syncMasterPatternsToLinkedFamily(updatedTracks, effMaster.id).tracks;
  return { updatedTracks, newPatternId };
}
