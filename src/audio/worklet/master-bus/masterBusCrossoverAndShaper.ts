/**
 * O Girador - Étage 1 Master Bus : Crossover Bass-Mono Complémentaire Sans Déphasage & Transient Shaper (< 120 lignes)
 * - Bass-Mono : filtre passe-bas 2 étages complémentaire (`High = In - Low`, `LowMono = 0.5*(LowL + LowR)`),
 *   réponse 100 % plate (`0.00 dB`) sur tout signal centré, monoïsation sous `crossoverHz` (`60..160 Hz`).
 * - Transient Shaper : double suiveur d'enveloppe différentiel (rapide ~1.5 ms vs lent ~25 ms),
 *   court-circuité à coût 0 lorsque `transientAttackDb === 0 && transientSustainDb === 0`.
 */

import { MasterBusDspState } from './masterBusWorkletTypes';

const TWO_PI = 2 * Math.PI;

export function processMasterStage1CrossoverAndShaper(
  s: MasterBusDspState,
  bufL: Float32Array,
  bufR: Float32Array,
  numFrames: number
): void {
  const p = s.params;
  if (p.ecoBypassAesthetic) return;

  const sr = s.sampleRate;
  // 1A. Complementary Bass-Mono (0.00 dB Mid identity, 12 dB/oct Side mono-centering below crossoverHz)
  if (p.bassMonoEnabled) {
    const fc = Math.max(60, Math.min(160, p.bassMonoCrossoverHz));
    const alpha = 1 - Math.exp((-TWO_PI * fc) / sr);
    let lp1S = s.bmLp1L, lp2S = s.bmLp2L;

    for (let i = 0; i < numFrames; i++) {
      const xL = bufL[i];
      const xR = bufR[i];
      const mid = 0.5 * (xL + xR);
      const side = 0.5 * (xL - xR);
      lp1S += alpha * (side - lp1S);
      const hp1S = side - lp1S;
      lp2S += alpha * (hp1S - lp2S);
      const hpSide = hp1S - lp2S;
      bufL[i] = mid + hpSide;
      bufR[i] = mid - hpSide;
    }

    s.bmLp1L = lp1S; s.bmLp2L = lp2S;
  }

  // 1B. Differential Envelope Transient Shaper (0 cost when neutral)
  const attDb = p.transientAttackDb;
  const susDb = p.transientSustainDb;
  if (Math.abs(attDb) < 1e-3 && Math.abs(susDb) < 1e-3) {
    s.tsSmoothGain = 1;
    return;
  }

  const fastAtt = 1 - Math.exp(-1 / (0.0015 * sr));
  const fastRel = 1 - Math.exp(-1 / (0.015 * sr));
  const slowAtt = 1 - Math.exp(-1 / (0.025 * sr));
  const slowRel = 1 - Math.exp(-1 / (0.080 * sr));
  const tailRel = 1 - Math.exp(-1 / (0.180 * sr));
  const smoothC = s.smoothCoeff;

  let fastEnv = s.tsFastEnv;
  let slowEnv = s.tsSlowEnv;
  let tailEnv = s.tsTailEnv;
  let smoothG = s.tsSmoothGain;

  for (let i = 0; i < numFrames; i++) {
    const absIn = Math.max(Math.abs(bufL[i]), Math.abs(bufR[i]));
    fastEnv += (absIn > fastEnv ? fastAtt : fastRel) * (absIn - fastEnv);
    slowEnv += (absIn > slowEnv ? slowAtt : slowRel) * (absIn - slowEnv);
    tailEnv += (absIn > tailEnv ? slowAtt : tailRel) * (absIn - tailEnv);

    const denom = Math.max(1e-4, slowEnv + 1e-4);
    const attNorm = Math.max(0, Math.min(1, (fastEnv - slowEnv) / denom));
    const susNorm = Math.max(0, Math.min(1, (tailEnv - fastEnv) / Math.max(1e-4, tailEnv + 1e-4)));

    const modDb = attNorm * attDb + susNorm * susDb;
    const targetG = Math.pow(10, modDb / 20);
    smoothG += smoothC * (targetG - smoothG);

    bufL[i] *= smoothG;
    bufR[i] *= smoothG;
  }

  s.tsFastEnv = fastEnv;
  s.tsSlowEnv = slowEnv;
  s.tsTailEnv = tailEnv;
  s.tsSmoothGain = smoothG;
}
