/**
 * O Girador - Vocal Haas Effect Stereo Widener Module for Coro
 * Architecture Mid/Side (M/S) avec annulation de phase parfaite en mono.
 */

import * as Tone from 'tone';
import { masterVolumeNode } from '../effectsChain';
import { ActiveVocal } from './vocalTypes';

export function createHaasModule(mainGain: Tone.Gain, resolvedOutput: any): ActiveVocal['haasNodes'] {
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
  sideGainLeft.gain.value = 0.38;

  const sideGainRight = rawCtx.createGain();
  sideGainRight.gain.value = -0.38;

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
