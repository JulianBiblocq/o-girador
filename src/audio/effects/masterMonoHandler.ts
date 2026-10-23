/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Module de commutation Mono Check Master sans clic audio (< 90 lignes).
 */
import * as Tone from 'tone';

let stereoBranchGain: GainNode | null = null;
let monoSummingNode: GainNode | null = null;
let monoBranchGain: GainNode | null = null;
let currentIsMono = false;

export function initMasterMonoNodes(sourceNode: any): void {
  const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
  if (!rawCtx) return;

  if (stereoBranchGain) {
    try { stereoBranchGain.disconnect(); } catch (_) {}
  }
  if (monoBranchGain) {
    try { monoBranchGain.disconnect(); } catch (_) {}
  }
  if (monoSummingNode) {
    try { monoSummingNode.disconnect(); } catch (_) {}
  }

  // 1. Branche Stéréo directe
  stereoBranchGain = rawCtx.createGain();
  stereoBranchGain.channelCount = 2;
  stereoBranchGain.channelCountMode = 'explicit';
  stereoBranchGain.gain.value = currentIsMono ? 0.0 : 1.0;

  // 2. Branche Mono sommatrice W3C (0.5 * (L + R) redistribué sur L et R)
  monoSummingNode = rawCtx.createGain();
  monoSummingNode.channelCount = 1;
  monoSummingNode.channelCountMode = 'explicit';

  monoBranchGain = rawCtx.createGain();
  monoBranchGain.channelCount = 2;
  monoBranchGain.channelCountMode = 'explicit';
  monoBranchGain.gain.value = currentIsMono ? 1.0 : 0.0;

  sourceNode.connect(stereoBranchGain);
  sourceNode.connect(monoSummingNode);
  monoSummingNode.connect(monoBranchGain);

  const destNode = ((Tone.getDestination() as any).input || Tone.getDestination()) as AudioNode;
  stereoBranchGain.connect(destNode);
  monoBranchGain.connect(destNode);
}

export function setMasterMonoCheck(isMono: boolean): void {
  currentIsMono = isMono;
  if (!stereoBranchGain || !monoBranchGain) return;

  const rawCtx = (Tone.getContext()?.rawContext || Tone.context) as AudioContext;
  const now = rawCtx ? rawCtx.currentTime : 0;
  const targetStereo = isMono ? 0.0 : 1.0;
  const targetMono = isMono ? 1.0 : 0.0;

  // Ancrage strict des rampes Web Audio pour commutation fluide sans clic
  const sParam = stereoBranchGain.gain;
  sParam.cancelScheduledValues(now);
  sParam.setValueAtTime(sParam.value, now);
  sParam.linearRampToValueAtTime(targetStereo, now + 0.015);

  const mParam = monoBranchGain.gain;
  mParam.cancelScheduledValues(now);
  mParam.setValueAtTime(mParam.value, now);
  mParam.linearRampToValueAtTime(targetMono, now + 0.015);
}

export function isMasterMonoActive(): boolean {
  return currentIsMono;
}

export function disposeMasterMonoNodes(): void {
  try { stereoBranchGain?.disconnect(); } catch (_) {}
  try { monoBranchGain?.disconnect(); } catch (_) {}
  try { monoSummingNode?.disconnect(); } catch (_) {}
  stereoBranchGain = null;
  monoBranchGain = null;
  monoSummingNode = null;
}
