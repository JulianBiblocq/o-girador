import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

const getLinkedSlaveTrackIds = (tracks: TrackGroup[], trackId: number | string): number[] => {
  const target = tracks.find(t => String(t.id) === String(trackId) || instrumentsConfig[t.instrumentIdx]?.id === String(trackId));
  if (!target) return [];
  if (target.isLinkMaster) {
    return tracks
      .filter(s => s.id !== target.id && !s.isLinkFolder && !s.isLinkMaster && s.linkedToTrackId &&
        (String(s.linkedToTrackId) === String(target.linkedToTrackId) || String(s.linkedToTrackId) === String(target.id)))
      .map(s => s.id);
  }
  if (target.isBusFolder || target.isLinkFolder) {
    return tracks
      .filter(s => s.id !== target.id && (String(s.linkedToTrackId) === String(target.id) || String(s.busId) === String(target.id)))
      .map(s => s.id);
  }
  return [];
};

export const handleTrackSwingChangeState = (
  tracks: TrackGroup[],
  id: number,
  val: number
): TrackGroup[] => {
  const slaveIds = new Set(getLinkedSlaveTrackIds(tracks, id));
  return tracks.map((t) => (t.id === id || slaveIds.has(t.id)) ? { ...t, swingIntensity: val, balancoAmount: val } : t);
};

export const handlePatternSwingChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  val: number
): TrackGroup[] => {
  const target = tracks.find(t => t.id === trackId);
  const changedPtn = target?.patterns.find(p => p.id === patternId);
  const slaveIds = new Set(getLinkedSlaveTrackIds(tracks, trackId));

  return tracks.map((t) => {
    if (t.id === trackId) {
      return {
        ...t,
        patterns: t.patterns.map((p) => (p.id === patternId ? { ...p, swingIntensity: val, balancoAmount: val } : p))
      };
    }
    if (slaveIds.has(t.id) && changedPtn) {
      return {
        ...t,
        patterns: t.patterns.map((p) => (p.name === changedPtn.name ? { ...p, swingIntensity: val, balancoAmount: val } : p))
      };
    }
    return t;
  });
};

export const handleTrackBalancoChangeState = (
  tracks: TrackGroup[],
  trackId: number | string,
  presetId?: string,
  amount?: number
): TrackGroup[] => {
  const slaveIds = new Set(getLinkedSlaveTrackIds(tracks, trackId));
  return tracks.map((t) => {
    const matchesId = String(t.id) === String(trackId);
    const matchesInst = instrumentsConfig[t.instrumentIdx]?.id === String(trackId);
    const isSlave = slaveIds.has(t.id);
    if (matchesId || matchesInst || isSlave) {
      return {
        ...t,
        ...(presetId !== undefined ? { balancoPresetId: presetId } : {}),
        ...(amount !== undefined ? { balancoAmount: amount, swingIntensity: amount } : {})
      };
    }
    return t;
  });
};

export const handlePatternBalancoChangeState = (
  tracks: TrackGroup[],
  trackId: number | string,
  patternId: number,
  presetId?: string,
  amount?: number
): TrackGroup[] => {
  const target = tracks.find(t => String(t.id) === String(trackId) || instrumentsConfig[t.instrumentIdx]?.id === String(trackId));
  const changedPtn = target?.patterns.find(p => String(p.id) === String(patternId));
  const slaveIds = new Set(getLinkedSlaveTrackIds(tracks, trackId));

  return tracks.map((t) => {
    const matchesTarget = t.id === target?.id;
    const isSlave = slaveIds.has(t.id);
    if (matchesTarget) {
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          if (String(p.id) === String(patternId)) {
            return {
              ...p,
              balancoPresetId: presetId,
              ...(amount !== undefined ? { balancoAmount: amount, swingIntensity: amount } : {})
            };
          }
          return p;
        })
      };
    }
    if (isSlave && changedPtn) {
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          if (p.name === changedPtn.name) {
            return {
              ...p,
              balancoPresetId: presetId,
              ...(amount !== undefined ? { balancoAmount: amount, swingIntensity: amount } : {})
            };
          }
          return p;
        })
      };
    }
    return t;
  });
};

export { handleResetPatternMicrotimingsState } from './trackMicrotimingsResetHelper';
