/**
 * offlineAuxSendsHelper.ts — Prises de départ Aux hors-ligne (Réverbe & Saturation) Pistes + Bus (< 85 lignes).
 */
import { computeEffectiveAuxSendLinearGain, computePostBusCascadeLinearGain } from '../../audio/effects/postBusSendRouter';
import { percentToDb } from '../../hooks/audio-sync/audioParamsCache';
import { faderPositionToGain } from '../audioMath';
import { isAutomationBypassed } from '../automationBypassHelper';
import { hasActiveTrackAutomation } from '../automationDetectHelper';
import type { BaqueCycleTimingResult } from '../baqueBounceTiming';

export function sendPctToLinear(pct: number | undefined): number {
  const db = percentToDb(pct ?? 0);
  return !Number.isFinite(db) || db <= -99 ? 0 : Math.pow(10, db / 20);
}

export function attachOfflineTrackAuxSends(
  ctx: OfflineAudioContext,
  allTracks: any[],
  baqueTracks: any[],
  trackInputs: Map<number, GainNode>,
  revTarget: AudioNode,
  distTarget: AudioNode,
  timing: BaqueCycleTimingResult,
  disableFx: boolean,
  globalBypass: any
): void {
  if (disableFx) return;
  for (const track of baqueTracks) {
    const input = trackInputs.get(track.id);
    if (!input) continue;
    const hasRevAuto = !isAutomationBypassed(track, 'reverb', globalBypass) && hasActiveTrackAutomation(track, 'reverb') && Boolean(track.measureReverbSends?.length);
    const revBase = computeEffectiveAuxSendLinearGain(allTracks, track.id, 'reverb', false);
    if (revBase > 1e-6 || hasRevAuto) {
      const revSend = ctx.createGain();
      revSend.gain.value = revBase;
      if (hasRevAuto) {
        const cascade = faderPositionToGain(track.volumeVal ?? 75) * computePostBusCascadeLinearGain(allTracks, track.id);
        for (let m = 0; m < timing.totalMeasures; m++) {
          const pct = track.measureReverbSends[m] ?? (track.fxSends?.reverb ?? track.reverbVal ?? 0);
          revSend.gain.setValueAtTime(cascade * sendPctToLinear(pct), timing.measureStartsSec[m]);
        }
      }
      input.connect(revSend);
      revSend.connect(revTarget);
    }
    const distBase = computeEffectiveAuxSendLinearGain(allTracks, track.id, 'distortion', false);
    if (distBase > 1e-6) {
      const distSend = ctx.createGain();
      distSend.gain.value = distBase;
      input.connect(distSend);
      distSend.connect(distTarget);
    }
  }
}

export function accumulateBusAuxSendsIntoBuffers(
  busL: Float32Array, busR: Float32Array, bus: any, allTracks: any[],
  revL: Float32Array, revR: Float32Array, distL: Float32Array, distR: Float32Array, disableFx: boolean
): void {
  if (disableFx || !bus) return;
  const vca = faderPositionToGain(bus.volumeVal ?? 75) * computePostBusCascadeLinearGain(allTracks, bus.id);
  if (vca <= 1e-6) return;
  const revG = vca * sendPctToLinear(bus.fxSends?.reverb ?? bus.reverbVal ?? 0);
  const distG = vca * sendPctToLinear(bus.fxSends?.distortion ?? 0);
  if (revG <= 1e-6 && distG <= 1e-6) return;
  const n = Math.min(busL.length, revL.length);
  for (let i = 0; i < n; i++) {
    if (revG > 1e-6) { revL[i] += busL[i] * revG; revR[i] += busR[i] * revG; }
    if (distG > 1e-6) { distL[i] += busL[i] * distG; distR[i] += busR[i] * distG; }
  }
}
