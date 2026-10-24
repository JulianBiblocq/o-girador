import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isSequencerVisibleTrack } from './trackVisibilityHelpers';

export const ensureToadaBus = (list: TrackGroup[]): TrackGroup[] => {
  const puxTrack = list.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = list.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  
  if (!puxTrack && !coroTrack) {
    return list;
  }

  let toadaBus = list.find(t => t.isBusFolder && t.customName === 'Toada');
  if (toadaBus) {
    const allPointersOk = list.every(t => {
      const isPux = instrumentsConfig[t.instrumentIdx]?.id === 'puxador';
      const isCoro = instrumentsConfig[t.instrumentIdx]?.id === 'coro';
      if (isPux || isCoro) {
        return String(t.busId) === String(toadaBus!.id);
      }
      return true;
    });
    if (allPointersOk) return list;
  }
  let nextList = [...list];

  if (!toadaBus) {
    const newBusId = 999901; // ID unique stable
    toadaBus = {
      id: newBusId,
      instrumentIdx: puxTrack ? puxTrack.instrumentIdx : (coroTrack ? coroTrack.instrumentIdx : 8),
      patterns: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75,
      selectedPatternId: 0,
      isBusFolder: true,
      isFolded: false,
      isSequencerFolded: false,
      customName: 'Toada',
      reverbVal: 0,
      panVal: 0,
      pan: 0,
      tuning: 0,
      fxSends: { reverb: 0, distortion: 0 }
    };

    const firstVoiceIndex = list.findIndex(t => 
      t.id === (puxTrack?.id ?? -1) || t.id === (coroTrack?.id ?? -1)
    );
    
    if (firstVoiceIndex !== -1) {
      nextList.splice(firstVoiceIndex, 0, toadaBus);
    } else {
      nextList.push(toadaBus);
    }
  }

  nextList = nextList.map(t => {
    const isPux = instrumentsConfig[t.instrumentIdx]?.id === 'puxador';
    const isCoro = instrumentsConfig[t.instrumentIdx]?.id === 'coro';
    if ((isPux || isCoro) && String(t.busId) !== String(toadaBus!.id)) {
      return { ...t, busId: String(toadaBus!.id) };
    }
    return t;
  });

  return nextList;
};

export const sanitizeRodaTrackOrder = (currentOrder: number[] | undefined, tracks: TrackGroup[]): number[] => {
  const trackIdSet = new Set(tracks.map(t => t.id));
  const validExisting = (currentOrder || []).filter(id => trackIdSet.has(id));
  const missing = tracks.map(t => t.id).filter(id => !validExisting.includes(id));
  return [...validExisting, ...missing];
};

export const applyRadii = (list: TrackGroup[], rodaTrackOrder?: number[]): TrackGroup[] => {
  const order = rodaTrackOrder && rodaTrackOrder.length > 0 ? rodaTrackOrder : list.map(t => t.id);
  const orderMap = new Map(order.map((id, index) => [id, index]));

  const drawableTracks = list.filter(t => {
    const isLinkedChild = Boolean(t.linkedToTrackId && !t.isLinkFolder);
    return (!t.isHidden || isLinkedChild) && 
      isSequencerVisibleTrack(t, list) && 
      instrumentsConfig[t.instrumentIdx]?.id !== 'apito';
  });

  drawableTracks.sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    return idxA - idxB;
  });

  const visibleCount = drawableTracks.length;
  const minRadius = 180;
  const maxRadius = 495;

  return list.map(t => {
    const drawableIdx = drawableTracks.findIndex(dt => dt.id === t.id);
    if (drawableIdx === -1) {
      return t;
    }
    const tNorm = visibleCount > 1 ? drawableIdx / (visibleCount - 1) : 0.5;
    const newRadius = maxRadius - tNorm * (maxRadius - minRadius);
    if (t.radius !== newRadius) {
      return { ...t, radius: newRadius };
    }
    return t;
  });
};
