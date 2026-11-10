/**
 * toadaVocalSlapback.ts
 * Écho Vocal Slapback Stéréo Léger pour le bus `TOADA` (0 Convolver, 100 % Web Audio natif, < 105 lignes) :
 * - Deux `DelayNode` stéréo décorrélés (`'short'` : `65 ms / 82 ms`, `'wide'` : `110 ms / 135 ms`).
 * - Filtrage passe-bande doux (`HPF 220 Hz` -> `LPF 4.2 kHz`) pour détacher l'écho de la voix lead.
 * - `wetGain` (`0..0.35`, `0` par défaut), muté sans clic lorsque `ecoConfig.disableFx` est actif.
 */
import type { ToadaSlapbackMode } from './studioFxPresets';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';

export interface ToadaVocalSlapbackStage {
  input: GainNode;
  output: GainNode;
  delayL: DelayNode;
  delayR: DelayNode;
  hpf: BiquadFilterNode;
  lpf: BiquadFilterNode;
  mode: ToadaSlapbackMode;
  wetPct: number;
  dispose: () => void;
}

let activeSlapbackStage: ToadaVocalSlapbackStage | null = null;

export function resolveSlapbackDelayTimesSec(mode: ToadaSlapbackMode): { leftSec: number; rightSec: number } {
  if (mode === 'wide') return { leftSec: 0.110, rightSec: 0.135 };
  return { leftSec: 0.065, rightSec: 0.082 };
}

export function createToadaVocalSlapback(
  rawCtx: BaseAudioContext,
  initialMode: ToadaSlapbackMode = 'off',
  initialWetPct = 0,
  disableFx = false
): ToadaVocalSlapbackStage {
  disposeToadaVocalSlapback();

  const input = rawCtx.createGain();
  input.gain.value = 1;

  const delayL = rawCtx.createDelay(0.25);
  const delayR = rawCtx.createDelay(0.25);
  const { leftSec, rightSec } = resolveSlapbackDelayTimesSec(initialMode);
  delayL.delayTime.value = leftSec;
  delayR.delayTime.value = rightSec;

  const merger = rawCtx.createChannelMerger(2);
  const hpf = rawCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 220;
  hpf.Q.value = Math.SQRT1_2;

  const lpf = rawCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 4200;
  lpf.Q.value = Math.SQRT1_2;

  const output = rawCtx.createGain();
  const clampedWet = Math.max(0, Math.min(35, initialWetPct)) / 100;
  output.gain.value = disableFx || initialMode === 'off' ? 0 : clampedWet;

  input.connect(delayL);
  input.connect(delayR);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(output);

  const stage: ToadaVocalSlapbackStage = {
    input, output, delayL, delayR, hpf, lpf,
    mode: initialMode, wetPct: initialWetPct,
    dispose: () => {
      try {
        input.disconnect(); delayL.disconnect(); delayR.disconnect();
        merger.disconnect(); hpf.disconnect(); lpf.disconnect(); output.disconnect();
      } catch { /* ignore */ }
    },
  };
  activeSlapbackStage = stage;
  return stage;
}

export function syncToadaVocalSlapback(
  mode: ToadaSlapbackMode = 'off',
  wetPct = 0,
  disableFx = false
): void {
  const s = activeSlapbackStage;
  if (!s) return;
  s.mode = mode;
  s.wetPct = Math.max(0, Math.min(35, Number.isFinite(wetPct) ? wetPct : 0));
  if (mode !== 'off') {
    const { leftSec, rightSec } = resolveSlapbackDelayTimesSec(mode);
    safeRampTo(s.delayL.delayTime, leftSec, 0.03);
    safeRampTo(s.delayR.delayTime, rightSec, 0.03);
  }
  const targetGain = disableFx || mode === 'off' ? 0 : s.wetPct / 100;
  safeRampTo(s.output.gain, targetGain, 0.025);
}

export function disposeToadaVocalSlapback(): void {
  if (!activeSlapbackStage) return;
  activeSlapbackStage.dispose();
  activeSlapbackStage = null;
}
