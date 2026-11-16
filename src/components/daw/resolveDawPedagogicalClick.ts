import React from 'react';
import { InstrumentConfig, Language, Pattern, TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { getTrackDisplayName } from '../../utils/colorHelpers';
import { buildPercussionPedagogyTarget, buildVocalRoleCard } from '../pedagogy/resolvePedagogyPopoverModel';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

function resolveMeasurePatternForTrack(track: TrackGroup | undefined, measureIdx: number): Pattern | null {
  if (!track) return null;
  const ov = track.patternOverrides?.[measureIdx];
  if (ov === null) return null;
  if (ov !== undefined) return track.patterns?.find((p) => p.id === ov) || null;
  return track.patterns?.find((p) => Boolean(p.measureAssignments?.[measureIdx])) || track.patterns?.[0] || null;
}

export function resolveDawPedagogicalClick(params: {
  e: React.MouseEvent;
  rowTrack: TrackGroup;
  effectiveTrack: TrackGroup;
  allTracks: TrackGroup[];
  activePattern: Pattern | null;
  masterActivePattern: Pattern | null;
  inst: InstrumentConfig;
  measureIdx: number;
  stepIdx: number;
  currentVal: any;
  isLeftHanded: boolean;
  lang: Language;
}): StrokeInfoPopoverTarget | null {
  const {
    e, rowTrack, effectiveTrack, allTracks, activePattern, masterActivePattern,
    inst, measureIdx, stepIdx, currentVal, isLeftHanded, lang,
  } = params;

  const isToada = isToadaBus(rowTrack) || rowTrack.customName === 'Toada' || inst.id === 'toada';
  const isVocal = isToada || inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro';

  if (isVocal) {
    const puxTrack = isToada
      ? allTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || t.customName === 'Puxador')
      : (inst.id === 'puxador' ? effectiveTrack : undefined);
    const coroTrack = isToada
      ? allTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || t.customName === 'Coro')
      : (inst.id === 'coro' ? effectiveTrack : undefined);

    const puxPat = isToada ? resolveMeasurePatternForTrack(puxTrack, measureIdx) : (inst.id === 'puxador' ? activePattern : null);
    const coroPat = isToada ? resolveMeasurePatternForTrack(coroTrack, measureIdx) : (inst.id === 'coro' ? activePattern : null);

    const cards = [
      puxTrack && puxPat ? buildVocalRoleCard({ role: 'puxador', roleTrack: puxTrack, pattern: puxPat, stepIdx, lang }) : null,
      coroTrack && coroPat ? buildVocalRoleCard({ role: 'coro', roleTrack: coroTrack, pattern: coroPat, stepIdx, lang }) : null,
    ].filter(Boolean) as NonNullable<ReturnType<typeof buildVocalRoleCard>>[];

    if (cards.length === 0) return null;
    return {
      anchorX: e.clientX,
      anchorY: e.clientY,
      trackId: cards[0].targetTrackId,
      patternId: cards[0].targetPatternId,
      measureIdx,
      stepIdx,
      instrumentName: getTrackDisplayName(rowTrack, allTracks) || inst.name,
      instId: inst.id,
      cards,
    };
  }

  let clickedSubIndex: 0 | 1 | undefined;
  if (Array.isArray(currentVal) && currentVal.length === 2) {
    const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect?.();
    if (rect && rect.width > 0) {
      clickedSubIndex = e.clientX - rect.left >= rect.width * 0.5 ? 1 : 0;
    }
  }

  const masterBaseVal = masterActivePattern?.activeSteps?.[stepIdx] ?? activePattern?.activeSteps?.[stepIdx];

  return buildPercussionPedagogyTarget({
    anchorX: e.clientX,
    anchorY: e.clientY,
    track: effectiveTrack,
    allTracks,
    inst,
    pattern: activePattern || masterActivePattern,
    measureIdx,
    stepIdx,
    rawVal: currentVal,
    masterBaseVal,
    clickedSubIndex,
    isLeftHanded,
    lang,
  });
}
