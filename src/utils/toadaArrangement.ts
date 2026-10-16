/**
 * toadaArrangement.ts
 * Logique pure d'arrangement et de déploiement d'un tour de Toada sur la Timeline.
 * Respect strict de l'architecture anti-monolithe (< 150 lignes).
 */
import { instrumentsConfig } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';
import type { TrackGroup, ToadaConductorSlot } from '../types/store.types';

export function buildToadaConductorSlots(
  rawSlots: any[] = [],
  rawPatterns: any[] = [],
  patIdMap: Map<string, number>
): ToadaConductorSlot[] {
  return rawSlots.map((s) => {
    const pPat = rawPatterns.find((x: any) => x.id === s.puxadorPatternId);
    const cPat = rawPatterns.find((x: any) => x.id === s.coroPatternId);
    const measuresCount = Math.max(pPat?.measuresCount || 0, cPat?.measuresCount || 0, 1);
    return {
      puxadorPatternId: s.puxadorPatternId ? patIdMap.get(s.puxadorPatternId) : undefined,
      coroPatternId: s.coroPatternId ? patIdMap.get(s.coroPatternId) : undefined,
      measuresCount
    };
  });
}

export function deployToadaCycle(state: any, startMeasureIdx: number): Partial<any> {
  const slots: ToadaConductorSlot[] = state.toadaConductorSlots || [];
  if (!slots.length) return {};

  const puxTrack = state.tracks.find((t: TrackGroup) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = state.tracks.find((t: TrackGroup) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  if (!puxTrack && !coroTrack) return {};

  const totalCycleMeasures = slots.reduce((acc, s) => acc + Math.max(1, s.measuresCount || 1), 0);
  const endMeasure = startMeasureIdx + totalCycleMeasures;
  const nextTotal = Math.max(state.totalMeasures || 8, endMeasure);

  const expand = <T>(arr: T[], fill: T): T[] => {
    const copy = [...(arr || [])];
    while (copy.length < nextTotal) copy.push(fill);
    return copy;
  };

  const lastBpm = state.measureBpms?.[state.measureBpms.length - 1] ?? state.bpm ?? 100;
  const lastSig = state.measureTimeSigs?.[state.measureTimeSigs.length - 1] ?? state.timeSig ?? '4/4';
  const lastVol = state.measureVols?.[state.measureVols.length - 1] ?? 100;

  // Préparation des assignations Puxador et Coro
  const nextTracks = state.tracks.map((t: TrackGroup) => {
    const isPux = puxTrack && t.id === puxTrack.id;
    const isCoro = coroTrack && t.id === coroTrack.id;
    if (!isPux && !isCoro) {
      return {
        ...t,
        patterns: t.patterns.map((p) => ({ ...p, measureAssignments: expand(p.measureAssignments || [], false) }))
      };
    }

    // Réinitialisation UNIQUEMENT de la plage déployée [startMeasureIdx, endMeasure - 1]
    const resetPatterns = t.patterns.map((p) => {
      const assign = expand(p.measureAssignments || [], false);
      for (let m = startMeasureIdx; m < endMeasure && m < nextTotal; m++) assign[m] = false;
      return { ...p, measureAssignments: assign };
    });

    // Déploiement slot par slot (Cohabitation Puxador & Coro verrouillée)
    let curM = startMeasureIdx;
    for (const slot of slots) {
      const span = Math.max(1, slot.measuresCount || 1);
      const targetPatId = isPux ? slot.puxadorPatternId : slot.coroPatternId;
      if (targetPatId !== undefined) {
        const pat = resetPatterns.find((p) => p.id === targetPatId);
        if (pat) {
          for (let m = curM; m < curM + span && m < nextTotal; m++) pat.measureAssignments[m] = true;
        }
      }
      curM += span;
    }

    return { ...t, patterns: resetPatterns };
  });

  return {
    totalMeasures: nextTotal,
    tracks: nextTracks,
    measureBpms: expand(state.measureBpms, lastBpm),
    measureTimeSigs: expand(state.measureTimeSigs, lastSig),
    measureVols: expand(state.measureVols, lastVol),
    measureBpmTransitions: expand(state.measureBpmTransitions, 'immediate'),
    measureVolTransitions: expand(state.measureVolTransitions, 'immediate'),
    measureSignals: expand(state.measureSignals, null),
    tracksVersion: (state.tracksVersion || 0) + 1
  };
}

export function checkAndTriggerToadaQuickPrompt(trackId: number, patternId: number, measureIdx: number): void {
  const store = useSequencerStore.getState();
  const slots = store.toadaConductorSlots || [];
  if (slots.length <= 1) return;

  const firstSlot = slots[0];
  const puxTrack = store.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  if (!puxTrack) return;
  const isPux = trackId === puxTrack.id;
  const isToada = store.tracks.some((t) => t.id === trackId && (t.isBusFolder && (t.customName === 'Toada' || String(t.id) === 'toada')));
  if (!isPux && !isToada) return;
  if (patternId !== firstSlot.puxadorPatternId && patternId !== puxTrack.patterns[0]?.id) return;

  const coroTrack = store.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const span = Math.max(1, firstSlot.measuresCount || 1);
  const startCheck = measureIdx + span;
  const totalM = store.totalMeasures;

  let hasConflict = false;
  for (let m = startCheck; m < totalM; m++) {
    if (puxTrack.patterns.some((p) => p.measureAssignments?.[m])) { hasConflict = true; break; }
    if (coroTrack?.patterns.some((p) => p.measureAssignments?.[m])) { hasConflict = true; break; }
  }

  if (!hasConflict) {
    store.setPendingToadaQuickDeploy({ measureIdx });
  }
}

function tIdMismatch(a: number, b: number): boolean {
  return a !== b;
}
