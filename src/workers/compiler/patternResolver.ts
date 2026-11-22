import { findConcretePatternOwnerTrack } from '../../utils/soloVariationMatcher';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

export { resolvePatternVariation } from './patternVariationResolver';

const hasActiveStrokes = (ptn: any): boolean =>
  Boolean(ptn?.activeSteps?.some((s: any) => (Array.isArray(s) ? s.some((x: any) => x && x !== '0') : s && s !== '0' && s !== 0)));

function findPatternByOverrideId(track: any, tracks: any[], overrideId: number): any | null {
  const pid = String(overrideId);
  const own = track.patterns?.find((p: any) => String(p.id) === pid);
  if (own) return own;
  const master = isSlaveTrack(track, tracks) ? resolveMasterTrack(track.id, tracks) : null;
  const fromMaster = master?.patterns?.find((p: any) => String(p.id) === pid);
  if (fromMaster) return fromMaster;
  for (let i = 0; i < (tracks?.length || 0); i++) {
    const found = tracks[i]?.patterns?.find((p: any) => String(p.id) === pid);
    if (found) return found;
  }
  return null;
}

export function resolveActivePattern(
  track: any,
  tracks: any[],
  measureIdx: number,
  isSoloPlayActive: boolean,
  soloPatternPlayId: number | null
): any | null {
  if (!track) return null;
  const isSlave = isSlaveTrack(track, tracks);

  if (isSoloPlayActive) {
    const ownMatch = track.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
    if (ownMatch) return ownMatch;

    const soloOwner = findConcretePatternOwnerTrack(tracks, soloPatternPlayId);
    const soloPtn = soloOwner?.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
    if (!soloOwner || !soloPtn) return null;

    const isMemberOfLinkFolder = Boolean(
      soloOwner.isLinkFolder && !track.isBusFolder && !track.isLinkFolder &&
      (String(track.linkedToTrackId) === String(soloOwner.id) || String(track.busId) === String(soloOwner.id))
    );
    const ownerMasterId = isSlaveTrack(soloOwner, tracks) ? resolveMasterTrack(soloOwner.id, tracks)?.id : (soloOwner.isLinkMaster ? soloOwner.id : null);
    const trackMasterId = isSlave ? resolveMasterTrack(track.id, tracks)?.id : (track.isLinkMaster ? track.id : null);
    const isSameLinkedFamily = Boolean(
      !track.isBusFolder && !track.isLinkFolder &&
      ownerMasterId !== null && ownerMasterId !== undefined &&
      trackMasterId !== null && trackMasterId !== undefined &&
      String(ownerMasterId) === String(trackMasterId)
    );

    if (isMemberOfLinkFolder || isSameLinkedFamily) {
      let matchedPtn = track.patterns?.find((p: any) => String(p.id) === String(soloPtn.id));
      if (!matchedPtn && soloPtn.name) {
        matchedPtn = track.patterns?.find((p: any) => p.name?.trim().toLowerCase() === soloPtn.name?.trim().toLowerCase());
      }
      if (!matchedPtn) {
        const soloIdx = soloOwner.patterns?.findIndex((p: any) => String(p.id) === String(soloPatternPlayId));
        if (soloIdx !== undefined && soloIdx >= 0 && track.patterns?.[soloIdx]) matchedPtn = track.patterns[soloIdx];
      }
      if (matchedPtn && hasActiveStrokes(matchedPtn)) return matchedPtn;
      return matchedPtn || soloPtn;
    }
    return null;
  }

  const overrideVal = track.patternOverrides?.[measureIdx];
  if (overrideVal === null) return null;
  if (typeof overrideVal === 'number') return findPatternByOverrideId(track, tracks, overrideVal);

  const assigned = track.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
  if (assigned) return assigned;

  if (isSlave) {
    const master = resolveMasterTrack(track.id, tracks);
    const masterPtn = master?.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
    if (masterPtn) {
      if (track.patterns && track.patterns.length > 0) {
        const matchById = track.patterns.find((p: any) => String(p.id) === String(masterPtn.id));
        if (matchById) return matchById;
        const normMasterName = masterPtn.name?.trim().toLowerCase();
        const matchByName = normMasterName
          ? track.patterns.find((p: any) => p.name?.trim().toLowerCase() === normMasterName)
          : undefined;
        if (matchByName) return matchByName;
        if (master?.patterns && track.patterns.length === master.patterns.length) {
          const mIdx = master.patterns.findIndex((p: any) => p.id === masterPtn.id);
          const cand = mIdx >= 0 ? track.patterns[mIdx] : undefined;
          const isOverrideTarget =
            cand && Object.values(track.patternOverrides || {}).some((ov) => ov !== null && String(ov) === String(cand.id));
          if (cand && !isOverrideTarget) return cand;
        }
      }
      return masterPtn;
    }
    const linkFolder = tracks.find((t: any) => t.isLinkFolder && String(t.id) === String(track.linkedToTrackId));
    const folderPtn = linkFolder?.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
    if (folderPtn) return track.patterns?.find((p: any) => p.name === folderPtn.name) || folderPtn;
  }

  return null;
}
