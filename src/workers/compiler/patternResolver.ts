import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

const hasActiveStrokes = (ptn: any): boolean =>
  Boolean(ptn?.activeSteps?.some((s: any) => Array.isArray(s) ? s.some((x: any) => x && x !== '0') : (s && s !== '0' && s !== 0)));

export function resolveActivePattern(
  track: any,
  tracks: any[],
  measureIdx: number,
  isSoloPlayActive: boolean,
  soloPatternPlayId: number | null
): any | null {
  const isSlave = isSlaveTrack(track, tracks);

  if (isSoloPlayActive) {
    const ownMatch = track.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
    if (ownMatch) return ownMatch;

    const soloOwner = tracks.find((t: any) => t.patterns?.some((p: any) => String(p.id) === String(soloPatternPlayId)));
    const soloPtn = soloOwner?.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
    if (!soloOwner || !soloPtn) return null;

    const isMemberOfLinkFolder = Boolean(
      soloOwner.isLinkFolder && !track.isBusFolder && !track.isLinkFolder &&
      (String(track.linkedToTrackId) === String(soloOwner.id) || String(track.busId) === String(soloOwner.id))
    );
    const isSlaveOfMaster = Boolean(
      soloOwner.isLinkMaster && isSlave &&
      String(resolveMasterTrack(track.id, tracks)?.id) === String(soloOwner.id)
    );

    if (isMemberOfLinkFolder || isSlaveOfMaster) {
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

  if (isSlave) {
    const override = track.patternOverrides?.[measureIdx];
    if (override === null) return null;
    if (override !== undefined) {
      const foundOverride = track.patterns?.find((p: any) => p.id === override);
      if (foundOverride) return foundOverride;
    }
  }

  const assigned = track.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
  if (assigned) return assigned;

  if (isSlave) {
    const master = resolveMasterTrack(track.id, tracks);
    const masterPtn = master?.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
    if (masterPtn) {
      if (track.patterns && track.patterns.length > 0) {
        const matchById = track.patterns.find((p: any) => String(p.id) === String(masterPtn.id));
        if (matchById) return matchById;
        const matchByName = track.patterns.find((p: any) => p.name === masterPtn.name);
        if (matchByName) return matchByName;
        const mIdx = master?.patterns?.findIndex((p: any) => p.id === masterPtn.id);
        if (mIdx !== undefined && mIdx >= 0 && track.patterns[mIdx]) return track.patterns[mIdx];
      }
      return masterPtn;
    }

    const linkFolder = tracks.find((t: any) => t.isLinkFolder && !t.isBusFolder && String(t.id) === String(track.linkedToTrackId));
    const folderPtn = linkFolder?.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
    if (folderPtn) {
      const matchByName = track.patterns?.find((p: any) => p.name === folderPtn.name);
      return matchByName || folderPtn;
    }
  }

  return null;
}

export function resolvePatternVariation(
  activePattern: any,
  isSoloPlayActive: boolean,
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  currentPlayCount: number,
  measureIdx: number,
  isolateBaseOnly: boolean,
  nextRand: () => number
): any | null {
  if (!activePattern.variations || activePattern.variations.length === 0) return null;

  if (isSoloPlayActive && soloPatternVariationId && soloPatternVariationId !== 'base' && soloPatternVariationId !== 'ensemble') {
    const matchById = activePattern.variations.find((v: any) => String(v.id) === String(soloPatternVariationId));
    if (matchById) return matchById;
    const matchByName = activePattern.variations.find((v: any) => v.name?.trim().toLowerCase() === soloPatternVariationId.trim().toLowerCase());
    if (matchByName) return matchByName;
  }
  if (isSoloPlayActive && soloPatternVariationId === 'base') return null;

  const isFirstTime = currentPlayCount === 0;
  if (isFirstTime) {
    const firstTimeVariations = activePattern.variations.filter((v: any) => v.playFirstTimeOnly);
    if (firstTimeVariations.length > 0) return firstTimeVariations[0];
  }

  if (!isolateBaseOnly) {
    const allowImprov = isSoloPlayActive || (activePattern.measureAllowVariations ? activePattern.measureAllowVariations[measureIdx] : true);
    if (allowImprov) {
      const validVariations = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
      if (validVariations.length > 0) {
        const rand = nextRand() * 100;
        let sum = 0;
        for (const variation of validVariations) {
          if (rand >= sum && rand < sum + variation.probability) return variation;
          sum += variation.probability;
        }
      }
    }
  }

  return null;
}
