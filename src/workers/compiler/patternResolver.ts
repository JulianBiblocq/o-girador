export function resolveActivePattern(
  track: any,
  tracks: any[],
  measureIdx: number,
  isSoloPlayActive: boolean,
  soloPatternPlayId: number | null
): any | null {
  const isLinkedChild = track.linkedToTrackId && !track.isLinkFolder;

  if (isLinkedChild) {
    const master = tracks.find((t: any) => String(t.id) === String(track.linkedToTrackId));
    if (!master) return null;

    if (isSoloPlayActive) {
      return master.patterns.find((p: any) => p.id === soloPatternPlayId) || null;
    }
    const override = track.isLinkMaster ? undefined : track.patternOverrides?.[measureIdx];
    if (override === null) return null;
    if (override !== undefined) {
      return master.patterns.find((p: any) => p.id === override) || null;
    }
    return master.patterns.find((p: any) => p.measureAssignments[measureIdx]) || null;
  }

  let sourceTrack = track;
  if (track.linkedToTrackId) {
    const master = tracks.find((t: any) => String(t.id) === String(track.linkedToTrackId));
    if (master) sourceTrack = master;
  }

  if (isSoloPlayActive) {
    let patternIdx = track.patterns.findIndex((p: any) => p.id === soloPatternPlayId);
    if (patternIdx === -1 && sourceTrack !== track) {
      patternIdx = sourceTrack.patterns.findIndex((p: any) => p.id === soloPatternPlayId);
    }
    if (patternIdx !== -1) {
      return sourceTrack.patterns[patternIdx] || sourceTrack.patterns[0] || null;
    }
    const hasSoloPattern = track.patterns.some((p: any) => p.id === soloPatternPlayId) ||
                           sourceTrack.patterns.some((p: any) => p.id === soloPatternPlayId);
    if (hasSoloPattern) {
      return sourceTrack.patterns.find((p: any) => p.id === soloPatternPlayId) || sourceTrack.patterns[0] || null;
    }
    return null;
  }

  return sourceTrack.patterns.find((p: any) => p.measureAssignments[measureIdx]) || null;
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

  if (isSoloPlayActive && soloPatternPlayId === activePattern.id && soloPatternVariationId && soloPatternVariationId !== 'base' && soloPatternVariationId !== 'ensemble') {
    return activePattern.variations.find((v: any) => v.id === soloPatternVariationId) || null;
  }
  if (isSoloPlayActive && soloPatternPlayId === activePattern.id && soloPatternVariationId === 'base') {
    return null;
  }
  if (isSoloPlayActive && soloPatternPlayId === activePattern.id && measureIdx >= 1) {
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
