import { TrackGroup } from '../../types';

export const repeatTrackAutomationsForMeasures = (
  t: TrackGroup,
  srcIdx: number,
  count: number,
  nextTotal: number
): Partial<TrackGroup> => {
  let nextVols = t.measureVols;
  let nextTrans = t.measureVolTransitions;
  if (t.measureVols) {
    const vols = [...t.measureVols];
    while (vols.length < nextTotal) vols.push(t.volumeVal ?? 75);
    for (let step = 1; step <= count; step++) {
      vols[srcIdx + step] = vols[srcIdx] !== undefined ? vols[srcIdx] : (t.volumeVal ?? 75);
    }
    nextVols = vols;
  }
  if (t.measureVolTransitions) {
    const trans = [...t.measureVolTransitions];
    while (trans.length < nextTotal) trans.push('immediate' as const);
    for (let step = 1; step <= count; step++) {
      trans[srcIdx + step] = trans[srcIdx] || 'immediate';
    }
    nextTrans = trans;
  }

  let nextPans = t.measurePans;
  let nextPanTrans = t.measurePanTransitions;
  if (t.measurePans) {
    const pans = [...t.measurePans];
    while (pans.length < nextTotal) pans.push(t.panVal ?? t.pan ?? 0);
    for (let step = 1; step <= count; step++) {
      pans[srcIdx + step] = pans[srcIdx] !== undefined ? pans[srcIdx] : (t.panVal ?? t.pan ?? 0);
    }
    nextPans = pans;
  }
  if (t.measurePanTransitions) {
    const pTrans = [...t.measurePanTransitions];
    while (pTrans.length < nextTotal) pTrans.push('immediate' as const);
    for (let step = 1; step <= count; step++) {
      pTrans[srcIdx + step] = pTrans[srcIdx] || 'immediate';
    }
    nextPanTrans = pTrans;
  }

  let nextReverbs = t.measureReverbSends;
  let nextReverbTrans = t.measureReverbTransitions;
  if (t.measureReverbSends) {
    const revs = [...t.measureReverbSends];
    while (revs.length < nextTotal) revs.push(t.fxSends?.reverb ?? t.reverbVal ?? 0);
    for (let step = 1; step <= count; step++) {
      revs[srcIdx + step] = revs[srcIdx] !== undefined ? revs[srcIdx] : (t.fxSends?.reverb ?? t.reverbVal ?? 0);
    }
    nextReverbs = revs;
  }
  if (t.measureReverbTransitions) {
    const rTrans = [...t.measureReverbTransitions];
    while (rTrans.length < nextTotal) rTrans.push('immediate' as const);
    for (let step = 1; step <= count; step++) {
      rTrans[srcIdx + step] = rTrans[srcIdx] || 'immediate';
    }
    nextReverbTrans = rTrans;
  }

  return {
    measureVols: nextVols,
    measureVolTransitions: nextTrans,
    measurePans: nextPans,
    measurePanTransitions: nextPanTrans,
    measureReverbSends: nextReverbs,
    measureReverbTransitions: nextReverbTrans
  };
};
