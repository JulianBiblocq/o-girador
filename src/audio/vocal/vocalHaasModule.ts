/**
 * O Girador - Vocal Haas Effect Stereo Widener Module for Coro
 * Architecture Mid/Side (M/S) avec annulation de phase parfaite en mono.
 * Bypass doux Palier 2 Eco : les gains Side rampent a 0 (signal Mid intact), 0 recablage.
 */

import * as Tone from 'tone';
import { masterVolumeNode } from '../effectsChain';
import { ActiveVocal, activeVocals } from './vocalTypes';

const HAAS_SIDE_GAIN = 0.38;
const HAAS_RAMP_TAU = 0.008; // ~25 ms pour atteindre la cible (3 tau)

export function createHaasModule(mainGain: Tone.Gain, resolvedOutput: any, isSideMuted = false): ActiveVocal['haasNodes'] {
  const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;

  const haasInput = rawCtx.createGain();
  haasInput.channelCount = 1;
  haasInput.channelCountMode = 'explicit';

  const delayNode = rawCtx.createDelay(0.05);
  delayNode.delayTime.value = 0.018; // 18 ms

  const filterNode = rawCtx.createBiquadFilter();
  filterNode.type = 'highpass';
  filterNode.frequency.value = 280; // 280 Hz

  // Side Left (+0.38) et Side Right (-0.38 en opposition de phase)
  const sideGainLeft = rawCtx.createGain();
  sideGainLeft.gain.value = isSideMuted ? 0 : HAAS_SIDE_GAIN;

  const sideGainRight = rawCtx.createGain();
  sideGainRight.gain.value = isSideMuted ? 0 : -HAAS_SIDE_GAIN;

  const merger = rawCtx.createChannelMerger(2);

  mainGain.connect(haasInput);

  // 1. Branche Mid (M) : signal direct envoyé à gain 1.0 sur L et R
  haasInput.connect(merger, 0, 0);
  haasInput.connect(merger, 0, 1);

  // 2. Branche Side (S) : retardée, filtrée et injectée en opposition de phase
  haasInput.connect(delayNode);
  delayNode.connect(filterNode);
  filterNode.connect(sideGainLeft);
  filterNode.connect(sideGainRight);
  sideGainLeft.connect(merger, 0, 0);
  sideGainRight.connect(merger, 0, 1);

  const destNode = (resolvedOutput && (resolvedOutput.input || resolvedOutput)) ||
    (masterVolumeNode && (masterVolumeNode.input || masterVolumeNode));
  merger.connect(destNode);

  return {
    input: haasInput,
    delay: delayNode,
    filter: filterNode,
    sideGainLeft,
    sideGainRight,
    merger,
  };
}

/** Rampe douce (setTargetAtTime) des gains Side de tous les modules Haas actifs. */
export function applyVocalHaasEco(isSideMuted: boolean): void {
  activeVocals.forEach((entry) => {
    const n = entry.haasNodes;
    if (!n) return;
    try {
      const now = n.sideGainLeft.context.currentTime;
      n.sideGainLeft.gain.setTargetAtTime(isSideMuted ? 0 : HAAS_SIDE_GAIN, now, HAAS_RAMP_TAU);
      n.sideGainRight.gain.setTargetAtTime(isSideMuted ? 0 : -HAAS_SIDE_GAIN, now, HAAS_RAMP_TAU);
    } catch (err) {
      console.error('[VocalHaas] Eco side-gain ramp failed:', err);
    }
  });
}

export function disposeHaasNodes(nodes?: ActiveVocal['haasNodes']): void {
  if (!nodes) return;
  try {
    nodes.input.disconnect();
    nodes.delay.disconnect();
    nodes.filter.disconnect();
    nodes.sideGainLeft.disconnect();
    nodes.sideGainRight.disconnect();
    nodes.merger.disconnect();
  } catch (_) {}
}
