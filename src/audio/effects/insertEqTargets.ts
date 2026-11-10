import * as Tone from 'tone';
import { safeRampFreq, safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';

export interface InsertEqNodes { low: Tone.Filter; mid: Tone.Filter; high: Tone.Filter }

export function createInsertEqNodes(eq: any): InsertEqNodes {
  return {
    low: new Tone.Filter(eq?.low?.f || 100, 'lowshelf'),
    mid: new Tone.Filter(eq?.mid?.f || 1000, 'peaking'),
    high: new Tone.Filter(eq?.high?.f || 8000, 'highshelf'),
  };
}

/**
 * Applique les cibles EQ / Low-Cut d'une tranche (piste ou bus) avec lissage 20 ms.
 * En Palier 2 Eco (`isNeutral`), les filtres restent connectes en serie mais passent au neutre
 * (Low-Cut 20 Hz, gains 0 dB) ; au retour, les vraies valeurs `eqBands` / `lowCut` sont restaurees.
 */
export function applyInsertEqTargets(
  lowCut: Tone.Filter, eqNodes: InsertEqNodes, track: any, isNeutral: boolean
): void {
  const eq = track?.eqBands;
  safeRampFreq(lowCut.frequency, !isNeutral && track?.lowCut ? 80 : 20, 0.02);
  safeRampFreq(eqNodes.low.frequency, eq?.low?.f ?? 100, 0.02);
  safeRampGainDb(eqNodes.low.gain, isNeutral ? 0 : (eq?.low?.g ?? 0), 0.02);
  safeRampFreq(eqNodes.mid.frequency, eq?.mid?.f ?? 1000, 0.02);
  safeRampGainDb(eqNodes.mid.gain, isNeutral ? 0 : (eq?.mid?.g ?? 0), 0.02);
  eqNodes.mid.Q.value = eq?.mid?.q === 'narrow' ? 2.5 : 0.7;
  safeRampFreq(eqNodes.high.frequency, eq?.high?.f ?? 8000, 0.02);
  safeRampGainDb(eqNodes.high.gain, isNeutral ? 0 : (eq?.high?.g ?? 0), 0.02);
}

