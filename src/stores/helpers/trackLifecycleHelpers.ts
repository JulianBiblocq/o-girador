import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { sanitizeRodaTrackOrder, applyRadii } from './trackRodaGeometryHelpers';
import { selectTracksMeta } from './trackMetaCache';
import { getDisplayedMixerTracks } from './mixerOrderingHelpers';

export const handleTrackDeleteState = (
  state: {
    tracks: TrackGroup[];
    rodaTrackOrder: number[];
    mixerBankOffset?: number;
    tracksVersion: number;
    [key: string]: any;
  },
  id: number
): Record<string, any> => {
  let updated = [...state.tracks];
  const trackToDelete = updated.find(t => t.id === id);

  if (trackToDelete) {
    if (trackToDelete.isLinkFolder) {
      const patternsToCopy = JSON.parse(JSON.stringify(trackToDelete.patterns));
      updated = updated.map(t => {
        if (String(t.linkedToTrackId) === String(id)) {
          return {
            ...t,
            linkedToTrackId: undefined,
            isLinkMaster: undefined,
            busId: undefined,
            patterns: patternsToCopy.length ? patternsToCopy : t.patterns
          };
        }
        return t;
      });
    } else if (trackToDelete.isLinkMaster && trackToDelete.linkedToTrackId) {
      const busId = trackToDelete.linkedToTrackId;
      const busTrack = updated.find(t => String(t.id) === String(busId) && t.isLinkFolder);
      const patternsToCopy = busTrack ? JSON.parse(JSON.stringify(busTrack.patterns)) : [];

      updated = updated.map(t => {
        if (t.id !== id && String(t.linkedToTrackId) === String(busId)) {
          return {
            ...t,
            linkedToTrackId: undefined,
            isLinkMaster: undefined,
            busId: undefined,
            patterns: patternsToCopy.length ? patternsToCopy : t.patterns
          };
        }
        return t;
      });
    } else if (trackToDelete.isBusFolder) {
      updated = updated.filter(t => String(t.busId) !== String(id));
    }
  }

  const remaining = updated.filter((t) => t.id !== id);
  const nextRodaOrder = sanitizeRodaTrackOrder(state.rodaTrackOrder, remaining);
  const nextTracks = applyRadii(remaining, nextRodaOrder);
  const nextMeta = selectTracksMeta({ ...state, tracks: nextTracks });
  const nextDisplayed = getDisplayedMixerTracks(nextMeta);
  const maxOffset = Math.max(0, nextDisplayed.length - 8);
  const nextMixerBankOffset = Math.min(state.mixerBankOffset || 0, maxOffset);

  return { 
    tracks: nextTracks,
    rodaTrackOrder: nextRodaOrder,
    tracksVersion: state.tracksVersion + 1,
    mixerBankOffset: nextMixerBankOffset
  };
};

export const duplicateTrackState = (
  state: {
    tracks: TrackGroup[];
    rodaTrackOrder: number[];
    lang?: string;
    tracksVersion: number;
    [key: string]: any;
  },
  trackId: number
): { tracks: TrackGroup[]; rodaTrackOrder: number[]; newTrackId: number } | null => {
  const originalTrack = state.tracks.find(t => t.id === trackId);
  if (!originalTrack) return null;

  const inst = instrumentsConfig[originalTrack.instrumentIdx];
  const newTrackId = Date.now() + Math.floor(Math.random() * 1000);
  const copySuffix = state.lang === 'fr' ? '(Copie)' : '(Cópia)';
  const baseName = originalTrack.customName || inst?.name || 'Piste';
  const newName = `${baseName} ${copySuffix}`;

  const newPatterns: Pattern[] = (originalTrack.patterns || []).map((p, pIdx) => ({
    ...JSON.parse(JSON.stringify(p)),
    id: newTrackId + 10 + pIdx + Math.floor(Math.random() * 100),
  }));

  const newTrack: TrackGroup = {
    ...JSON.parse(JSON.stringify(originalTrack)),
    id: newTrackId,
    customName: newName,
    patterns: newPatterns,
    selectedPatternId: newPatterns[0]?.id || 0,
    linkedToTrackId: undefined,
    isLinkMaster: undefined,
  };

  const origIndex = state.tracks.findIndex(t => t.id === trackId);
  const nextTracks = [...state.tracks];
  if (origIndex !== -1) {
    nextTracks.splice(origIndex + 1, 0, newTrack);
  } else {
    nextTracks.push(newTrack);
  }

  let nextRodaOrder = [...(state.rodaTrackOrder || [])];
  const rodaIdx = nextRodaOrder.indexOf(trackId);
  if (rodaIdx !== -1) {
    nextRodaOrder.splice(rodaIdx + 1, 0, newTrackId);
  } else {
    nextRodaOrder.push(newTrackId);
  }
  nextRodaOrder = sanitizeRodaTrackOrder(nextRodaOrder, nextTracks);
  const finalTracks = applyRadii(nextTracks, nextRodaOrder);

  return { tracks: finalTracks, rodaTrackOrder: nextRodaOrder, newTrackId };
};

export const handleTrackMuteToggleState = (tracks: TrackGroup[], id: number): TrackGroup[] =>
  tracks.map((t) => t.id === id ? { ...t, isMute: !t.isMute } : t);

export const handleTrackSoloToggleState = (tracks: TrackGroup[], id: number): TrackGroup[] =>
  tracks.map((t) => t.id === id ? { ...t, isSolo: !t.isSolo } : t);

export const handleTrackHideToggleState = (tracks: TrackGroup[], id: number): TrackGroup[] =>
  tracks.map((t) => t.id === id ? { ...t, isHidden: !t.isHidden } : t);

export const handleTrackInstrumentIdxChangeState = (tracks: TrackGroup[], id: number, targetInstIdx: number): TrackGroup[] =>
  tracks.map((t) => t.id === id ? { ...t, instrumentIdx: targetInstIdx } : t);
