import { TrackGroup } from '../../types';

export const handleTrackMeasureVolChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  mIdx: number,
  val: number,
  totalM = 8
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const currentVols = t.measureVols ? [...t.measureVols] : Array(totalM).fill(t.volumeVal ?? 75);
    while (currentVols.length < totalM) {
      currentVols.push(t.volumeVal ?? 75);
    }
    currentVols[mIdx] = val;
    return { ...t, measureVols: currentVols };
  }
  return t;
});

export const handleTrackMeasureVolTransitionChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  mIdx: number,
  val: 'immediate' | 'ramp' | 'bezier',
  totalM = 8
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const currentTrans = t.measureVolTransitions ? [...t.measureVolTransitions] : Array(totalM).fill('immediate' as const);
    while (currentTrans.length < totalM) {
      currentTrans.push('immediate');
    }
    currentTrans[mIdx] = val;
    return { ...t, measureVolTransitions: currentTrans };
  }
  return t;
});

export const handleTrackMeasurePanChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  mIdx: number,
  val: number,
  totalM = 8
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const currentPans = t.measurePans ? [...t.measurePans] : Array(totalM).fill(t.panVal ?? t.pan ?? 0);
    while (currentPans.length < totalM) {
      currentPans.push(t.panVal ?? t.pan ?? 0);
    }
    currentPans[mIdx] = val;
    return { ...t, measurePans: currentPans };
  }
  return t;
});

export const handleTrackMeasurePanTransitionChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  mIdx: number,
  val: 'immediate' | 'ramp' | 'bezier',
  totalM = 8
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const currentTrans = t.measurePanTransitions ? [...t.measurePanTransitions] : Array(totalM).fill('immediate' as const);
    while (currentTrans.length < totalM) {
      currentTrans.push('immediate');
    }
    currentTrans[mIdx] = val;
    return { ...t, measurePanTransitions: currentTrans };
  }
  return t;
});

export const handleTrackMeasureReverbChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  mIdx: number,
  val: number,
  totalM = 8
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const defaultRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const currentReverbs = t.measureReverbSends ? [...t.measureReverbSends] : Array(totalM).fill(defaultRev);
    while (currentReverbs.length < totalM) {
      currentReverbs.push(defaultRev);
    }
    currentReverbs[mIdx] = val;
    return { ...t, measureReverbSends: currentReverbs };
  }
  return t;
});

export const handleTrackMeasureReverbTransitionChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  mIdx: number,
  val: 'immediate' | 'ramp' | 'bezier',
  totalM = 8
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const currentTrans = t.measureReverbTransitions ? [...t.measureReverbTransitions] : Array(totalM).fill('immediate' as const);
    while (currentTrans.length < totalM) {
      currentTrans.push('immediate');
    }
    currentTrans[mIdx] = val;
    return { ...t, measureReverbTransitions: currentTrans };
  }
  return t;
});

export const toggleTrackAutomationBypassState = (
  tracks: TrackGroup[],
  trackId: number,
  type: 'volume' | 'pan' | 'reverb'
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    const currentBypass = t.automationBypass || {};
    return {
      ...t,
      automationBypass: {
        ...currentBypass,
        [type]: !currentBypass[type]
      }
    };
  }
  return t;
});
