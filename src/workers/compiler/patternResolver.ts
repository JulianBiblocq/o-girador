export function resolveActivePattern(
  track: any,
  tracks: any[],
  measureIdx: number,
  isSoloPlayActive: boolean,
  soloPatternPlayId: number | null
): any | null {
  const isLinkedChild = Boolean(track.linkedToTrackId && !track.isLinkFolder);

  if (isSoloPlayActive) {
    const ownMatch = track.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
    if (ownMatch) return ownMatch;

    const soloTrack = tracks.find((t: any) => t.patterns?.some((p: any) => String(p.id) === String(soloPatternPlayId)));
    if (soloTrack) {
      const isSameGroup = (soloTrack.id === track.id) ||
        (track.linkedToTrackId && (String(track.linkedToTrackId) === String(soloTrack.linkedToTrackId) || String(track.linkedToTrackId) === String(soloTrack.id) || String(track.id) === String(soloTrack.linkedToTrackId))) ||
        (soloTrack.linkedToTrackId && (String(soloTrack.linkedToTrackId) === String(track.linkedToTrackId) || String(soloTrack.linkedToTrackId) === String(track.id)));

      if (isSameGroup) {
        const soloPtn = soloTrack.patterns?.find((p: any) => String(p.id) === String(soloPatternPlayId));
        if (soloPtn) {
          const matchByName = track.patterns?.find((p: any) => p.name === soloPtn.name);
          if (matchByName) return matchByName;
          const soloIdx = soloTrack.patterns?.findIndex((p: any) => String(p.id) === String(soloPatternPlayId));
          if (soloIdx !== undefined && soloIdx >= 0 && track.patterns?.[soloIdx]) return track.patterns[soloIdx];
        }
      }
    }
    return null;
  }

  if (isLinkedChild && !track.isLinkMaster) {
    const override = track.patternOverrides?.[measureIdx];
    if (override === null) return null;
    if (override !== undefined) {
      const foundOverride = track.patterns?.find((p: any) => p.id === override);
      if (foundOverride) return foundOverride;
    }
  }

  const assigned = track.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
  if (assigned) return assigned;

  if (isLinkedChild && !track.isLinkMaster) {
    const master = tracks.find((t: any) => (String(t.linkedToTrackId) === String(track.linkedToTrackId) || String(t.id) === String(track.linkedToTrackId)) && t.isLinkMaster);
    const masterPtn = master?.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
    if (masterPtn) {
      const matchByName = track.patterns?.find((p: any) => p.name === masterPtn.name);
      if (matchByName) return matchByName;
      const mIdx = master?.patterns?.findIndex((p: any) => p.id === masterPtn.id);
      if (mIdx !== undefined && mIdx >= 0 && track.patterns?.[mIdx]) return track.patterns[mIdx];
    }
  }

  if (isLinkedChild) {
    const bus = tracks.find((t: any) => String(t.id) === String(track.linkedToTrackId) || String(t.id) === String(track.busId));
    const busPtn = bus?.patterns?.find((p: any) => p.measureAssignments?.[measureIdx]);
    if (busPtn) {
      const matchByName = track.patterns?.find((p: any) => p.name === busPtn.name);
      if (matchByName) return matchByName;
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
