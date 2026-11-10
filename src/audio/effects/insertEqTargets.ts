import * as Tone from 'tone';
import { safeRampFreq, safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';
import { lowCutNodes, eqNodes } from './effectsChainNodes';

export const BUTTERWORTH_Q = Math.SQRT1_2;

export interface InsertEqNodes { low: Tone.Filter; mid: Tone.Filter; high: Tone.Filter }

export function resolveLowCutTargetHz(track: any, isNeutral = false): number {
  return !isNeutral && track?.lowCut ? 80 : 20;
}

export function createLowCutFilter(track: any, isNeutral = false): Tone.Filter {
  const filter = new Tone.Filter(resolveLowCutTargetHz(track, isNeutral), 'highpass');
  try { filter.Q.value = BUTTERWORTH_Q; } catch (_) {}
  return filter;
}

export function createInsertEqNodes(eq: any): InsertEqNodes {
  return {
    low: new Tone.Filter(eq?.low?.f || 100, 'lowshelf'),
    mid: new Tone.Filter(eq?.mid?.f || 1000, 'peaking'),
    high: new Tone.Filter(eq?.high?.f || 8000, 'highshelf'),
  };
}

/**
 * Applique les cibles EQ / Low-Cut d'une tranche (piste ou bus) avec lissage 20 ms et Q Butterworth (0.7071).
 */
export function applyInsertEqTargets(
  lowCut: Tone.Filter, eqNodes: InsertEqNodes, track: any, isNeutral: boolean
): void {
  const eq = track?.eqBands;
  try { lowCut.Q.value = BUTTERWORTH_Q; } catch (_) {}
  safeRampFreq(lowCut.frequency, resolveLowCutTargetHz(track, isNeutral), 0.02);
  safeRampFreq(eqNodes.low.frequency, eq?.low?.f ?? 100, 0.02);
  safeRampGainDb(eqNodes.low.gain, isNeutral ? 0 : (eq?.low?.g ?? 0), 0.02);
  safeRampFreq(eqNodes.mid.frequency, eq?.mid?.f ?? 1000, 0.02);
  safeRampGainDb(eqNodes.mid.gain, isNeutral ? 0 : (eq?.mid?.g ?? 0), 0.02);
  eqNodes.mid.Q.value = eq?.mid?.q === 'narrow' ? 2.5 : BUTTERWORTH_Q;
  safeRampFreq(eqNodes.high.frequency, eq?.high?.f ?? 8000, 0.02);
  safeRampGainDb(eqNodes.high.gain, isNeutral ? 0 : (eq?.high?.g ?? 0), 0.02);
}

/**
 * Reinitialisation immediate sans clic (20 ms) de l'insert EQ + Low-Cut d'une tranche.
 */
export function resetInsertEqImmediate(trackId: string | number): void {
  const lowCut = lowCutNodes[trackId];
  const eq = eqNodes[trackId];
  if (lowCut) {
    try { lowCut.Q.value = BUTTERWORTH_Q; } catch (_) {}
    safeRampFreq(lowCut.frequency, 20, 0.02);
  }
  if (eq) {
    safeRampFreq(eq.low.frequency, 100, 0.02);
    safeRampGainDb(eq.low.gain, 0, 0.02);
    safeRampFreq(eq.mid.frequency, 1000, 0.02);
    safeRampGainDb(eq.mid.gain, 0, 0.02);
    try { eq.mid.Q.value = BUTTERWORTH_Q; } catch (_) {}
    safeRampFreq(eq.high.frequency, 8000, 0.02);
    safeRampGainDb(eq.high.gain, 0, 0.02);
  }
}

