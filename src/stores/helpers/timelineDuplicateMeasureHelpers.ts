/**
 * Fonctions utilitaires de duplication d'automations et voix pour la timeline (< 45 lignes).
 */

import { TrackGroup } from '../../types';

export const copyAutomations = (t: TrackGroup, src: number, dest: number): void => {
  if (t.measureVols) t.measureVols[dest] = t.measureVols[src] ?? (t.volumeVal ?? 75);
  if (t.measureVolTransitions) t.measureVolTransitions[dest] = t.measureVolTransitions[src] || 'immediate';
  if (t.measurePans) t.measurePans[dest] = t.measurePans[src] ?? (t.panVal ?? t.pan ?? 0);
  if (t.measurePanTransitions) t.measurePanTransitions[dest] = t.measurePanTransitions[src] || 'immediate';
  if (t.measureReverbSends) t.measureReverbSends[dest] = t.measureReverbSends[src] ?? (t.fxSends?.reverb ?? t.reverbVal ?? 0);
  if (t.measureReverbTransitions) t.measureReverbTransitions[dest] = t.measureReverbTransitions[src] || 'immediate';
};

export const duplicateVoiceMeasure = (
  pux: TrackGroup | undefined,
  coro: TrackGroup | undefined,
  m: number,
  target: number,
  isToada: boolean,
  isPux: boolean,
  total: number
): void => {
  const syncTrack = (tr: TrackGroup | undefined) => {
    if (!tr) return;
    const pat = tr.patterns.find(p => p.measureAssignments?.[m]);
    tr.patterns.forEach(p => {
      while (p.measureAssignments.length < total) p.measureAssignments.push(false);
      p.measureAssignments[target] = Boolean(pat && p.id === pat.id);
    });
  };
  if (isToada) { syncTrack(pux); syncTrack(coro); }
  else if (isPux) syncTrack(pux);
  else syncTrack(coro);
};
