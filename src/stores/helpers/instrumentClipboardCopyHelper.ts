import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getInstrumentFamily } from '../../utils/instrumentCompatibility';
import { isToadaBus, isToadaChild } from './trackVisibilityHelpers';
import { InstrumentPatternsClipboard } from '../slices/clipboardSliceTypes';

export const copyAllTrackPatternsData = (
  tracks: TrackGroup[],
  trackId: number,
  lang: string
): { clip: InstrumentPatternsClipboard; message: string } | null => {
  const rawTrack = tracks.find(t => t.id === trackId || String(t.id) === String(trackId));
  if (!rawTrack) return null;

  let effectiveTrack = rawTrack;
  if (rawTrack.linkedToTrackId) {
    const parentBus = tracks.find(t => String(t.id) === String(rawTrack.linkedToTrackId) && t.isLinkFolder);
    if (parentBus && parentBus.patterns && parentBus.patterns.length > 0) {
      effectiveTrack = parentBus;
    }
  } else if (rawTrack.isLinkMaster) {
    const parentBus = tracks.find(t => (String(t.id) === String(rawTrack.id) || String(t.linkedToTrackId) === String(rawTrack.id)) && t.isLinkFolder);
    if (parentBus && parentBus.patterns && parentBus.patterns.length > 0) {
      effectiveTrack = parentBus;
    }
  } else if (isToadaBus(rawTrack) && (!rawTrack.patterns || rawTrack.patterns.length === 0)) {
    const vocalChild = tracks.find(t => isToadaChild(t, tracks) && t.patterns && t.patterns.length > 0);
    if (vocalChild) effectiveTrack = vocalChild;
  }

  const inst = instrumentsConfig[effectiveTrack.instrumentIdx] || instrumentsConfig[rawTrack.instrumentIdx];
  const instId = inst?.id || (isToadaBus(rawTrack) ? 'toada' : '');
  const family = getInstrumentFamily(instId);
  const sourceType = (instId || '').toLowerCase();
  const sourceName = rawTrack.customName || inst?.name || (lang === 'fr' ? 'Piste' : 'Faixa');

  const clonedPatterns: Pattern[] = JSON.parse(JSON.stringify(effectiveTrack.patterns || []));
  const timelineAssignments: Record<string, boolean[]> = {};
  clonedPatterns.forEach(p => {
    if (p.measureAssignments) {
      timelineAssignments[String(p.id)] = [...p.measureAssignments];
    }
  });

  const count = clonedPatterns.length;
  const message = lang === 'fr'
    ? `${count} motif${count > 1 ? 's' : ''} copié${count > 1 ? 's' : ''}`
    : `${count} padrão(ões) copiado(s)`;

  return {
    clip: {
      sourceTrackId: rawTrack.id,
      sourceType,
      sourceName,
      sourceInstrumentIdx: effectiveTrack.instrumentIdx,
      sourceInstId: instId,
      sourceFamily: family,
      patterns: clonedPatterns,
      timelineAssignments
    },
    message
  };
};
