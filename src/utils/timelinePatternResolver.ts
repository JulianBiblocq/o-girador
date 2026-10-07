import { Pattern } from '../types';
import { instrumentsConfig } from '../data';
import { isToadaBus } from '../stores/useSequencerStore';
import { getNextPatternName } from './patternNaming';

export interface ResolvedCellPattern {
  activePattern: Pattern | null;
  ownerTrack: any | null;
}

/**
 * Résout le motif actif d'une cellule de la Timeline selon le type de piste (standard, esclave avec override, Toada).
 */
export function resolveActivePatternForCell(
  trackId: number,
  measureIdx: number,
  patternId: number | null,
  tracks: any[]
): ResolvedCellPattern {
  const targetTrack = tracks.find((t) => t.id === trackId);
  if (!targetTrack) return { activePattern: null, ownerTrack: null };

  const isSlave = Boolean(targetTrack.linkedToTrackId && !targetTrack.isLinkFolder && !targetTrack.isLinkMaster);
  const isToada = isToadaBus(targetTrack);

  if (isToada) {
    const puxTrack = tracks.find(
      (t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador'
    );
    const coroTrack = tracks.find(
      (t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro'
    );

    if (patternId !== null) {
      const pPtn = puxTrack?.patterns.find((p: Pattern) => p.id === patternId);
      if (pPtn) return { activePattern: pPtn, ownerTrack: puxTrack };
      const cPtn = coroTrack?.patterns.find((p: Pattern) => p.id === patternId);
      if (cPtn) return { activePattern: cPtn, ownerTrack: coroTrack };
    }

    const pPtn = puxTrack?.patterns.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx]));
    if (pPtn) return { activePattern: pPtn, ownerTrack: puxTrack };

    const cPtn = coroTrack?.patterns.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx]));
    if (cPtn) return { activePattern: cPtn, ownerTrack: coroTrack };

    return { activePattern: null, ownerTrack: puxTrack || coroTrack || targetTrack };
  }

  if (isSlave && targetTrack.linkedToTrackId) {
    const parentBus = tracks.find((t) => String(t.id) === String(targetTrack.linkedToTrackId) && t.isLinkFolder);
    if (!parentBus) return { activePattern: null, ownerTrack: targetTrack };

    const override = targetTrack.patternOverrides?.[measureIdx];
    if (override === null) {
      return { activePattern: null, ownerTrack: parentBus };
    }
    if (override !== undefined) {
      const ptn = parentBus.patterns.find((p: Pattern) => p.id === override) || null;
      return { activePattern: ptn, ownerTrack: parentBus };
    }
    const ptn = parentBus.patterns.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx])) || null;
    return { activePattern: ptn, ownerTrack: parentBus };
  }

  // Piste standard
  if (patternId !== null) {
    const ptn = targetTrack.patterns.find((p: Pattern) => p.id === patternId);
    if (ptn) return { activePattern: ptn, ownerTrack: targetTrack };
  }
  const ptn = targetTrack.patterns.find((p: Pattern) => Boolean(p.measureAssignments?.[measureIdx])) || null;
  return { activePattern: ptn, ownerTrack: targetTrack };
}

/**
 * Clone un motif, lui attribue un nouvel identifiant et un nom incrémenté,
 * et l'assigne exclusivement sur la mesure ciblée sans altérer les autres mesures.
 */
export function cloneAndIsolatePatternOnMeasure(
  ownerTrack: any,
  targetTrack: any,
  activePattern: Pattern,
  measureIdx: number,
  totalMeasures: number,
  lang: string,
  allTracks: any[]
): { updatedTracks: any[]; newPatternId: number } {
  const newPatternId = Date.now() + Math.floor(Math.random() * 1000);
  const newPatternName = getNextPatternName(ownerTrack.patterns, activePattern.name, lang);

  const clonedPattern: Pattern = {
    ...JSON.parse(JSON.stringify(activePattern)),
    id: newPatternId,
    name: newPatternName,
    measureAssignments: Array(totalMeasures).fill(false),
    measureAllowVariations: activePattern.measureAllowVariations
      ? Array(totalMeasures).fill(true)
      : undefined,
  };
  clonedPattern.measureAssignments[measureIdx] = true;

  const isSlave = Boolean(targetTrack?.linkedToTrackId && !targetTrack.isLinkFolder && !targetTrack.isLinkMaster);

  const updatedTracks = allTracks.map((t) => {
    if (t.id === ownerTrack.id) {
      const nextPatterns = t.patterns.map((p: Pattern) => {
        const nextAssignments = [...(p.measureAssignments || [])];
        while (nextAssignments.length <= measureIdx) nextAssignments.push(false);
        nextAssignments[measureIdx] = false;
        return { ...p, measureAssignments: nextAssignments };
      });
      return {
        ...t,
        patterns: [...nextPatterns, clonedPattern],
        selectedPatternId: newPatternId,
      };
    }
    if (isSlave && t.id === targetTrack.id) {
      const overrides = { ...(t.patternOverrides || {}) };
      overrides[measureIdx] = newPatternId;
      return { ...t, patternOverrides: overrides };
    }
    return t;
  });

  return { updatedTracks, newPatternId };
}
