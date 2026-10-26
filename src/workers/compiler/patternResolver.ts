import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

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

    if (isSlave) {
      const master = resolveMasterTrack(track.id, tracks);
      const masterPtn = master?.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
      if (masterPtn) {
        const matchByName = track.patterns?.find((p: any) => p.name === masterPtn.name);
        if (matchByName) return matchByName;
        const soloIdx = master?.patterns?.findIndex((p: any) => String(p.id) === String(soloPatternPlayId));
        if (soloIdx !== undefined && soloIdx >= 0 && track.patterns?.[soloIdx]) return track.patterns[soloIdx];
      }
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
      if (matchByName) return matchByName;
      return folderPtn;
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

  if (isSoloPlayActive && String(soloPatternPlayId) === String(activePattern.id) && soloPatternVariationId && soloPatternVariationId !== 'base' && soloPatternVariationId !== 'ensemble') {
    return activePattern.variations.find((v: any) => v.id === soloPatternVariationId) || null;
  }
  if (isSoloPlayActive && String(soloPatternPlayId) === String(activePattern.id) && soloPatternVariationId === 'base') {
    return null;
  }

  const isFirstTime = currentPlayCount === 0;
  if (isFirstTime) {
    const firstTimeVariations = activePattern.variations.filter((v: any) => v.playFirstTimeOnly);
    if (firstTimeVariations.length > 0) {
      return firstTimeVariations[0];
    }
  }

  if (!isolateBaseOnly) {
    const allowImprov = isSoloPlayActive || (activePattern.measureAllowVariations ? activePattern.measureAllowVariations[measureIdx] : true);
    if (allowImprov) {
      const validVariations = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
      if (validVariations.length > 0) {
        const rand = nextRand() * 100;
        let sum = 0;
        for (const variation of validVariations) {
          if (rand >= sum && rand < sum + variation.probability) {
            return variation;
          }
          sum += variation.probability;
        }
      }
    }
  }

  return null;
}
