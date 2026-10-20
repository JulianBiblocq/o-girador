/**
 * O Girador - Vocal Haas Effect Stereo Widener Module for Coro
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
  delayNode.delayTime.value = 0.018;

  const filterNode = rawCtx.createBiquadFilter();
  filterNode.type = 'highpass';
  filterNode.frequency.value = 280;

  const rightGain = rawCtx.createGain();
  rightGain.gain.value = 0.88;

  const merger = rawCtx.createChannelMerger(2);

  mainGain.connect(haasInput);
  haasInput.connect(merger, 0, 0);
  haasInput.connect(delayNode);
  delayNode.connect(filterNode);
  filterNode.connect(rightGain);
  rightGain.connect(merger, 0, 1);

  const destNode = (resolvedOutput && (resolvedOutput.input || resolvedOutput)) ||
    (masterVolumeNode && (masterVolumeNode.input || masterVolumeNode));
  merger.connect(destNode);

  return {
    input: haasInput,
    delay: delayNode,
    filter: filterNode,
    rightGain: rightGain,
    merger: merger,
  };
}

export function disposeHaasNodes(nodes?: ActiveVocal['haasNodes']): void {
  if (!nodes) return;
  try {
    nodes.input.disconnect();
    nodes.delay.disconnect();
    nodes.filter.disconnect();
    nodes.rightGain.disconnect();
    nodes.merger.disconnect();
  } catch (_) {}
}
