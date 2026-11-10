/**
 * Module de commutation Mono Check Master sans clic audio (< 90 lignes).
 * - Lorsque le `MasterBusWorkletProcessor` est actif (`workletHandlesMono = true`),
 *   la sommation `0.5 * (L + R)` est effectuée en interne avant le limiteur et la télémétrie,
 *   et le doublon aval est neutralisé (`stereoBranchGain = 1`, `monoBranchGain = 0`).
 */
import * as Tone from 'tone';

let stereoBranchGain: Tone.Gain | null = null;
let monoSummingNode: Tone.Gain | null = null;
let monoBranchGain: Tone.Gain | null = null;
let currentIsMono = false;
let workletHandlesMono = false;

function setToneGainChannels(toneGain: Tone.Gain, count: number) {
  const rawNode = (toneGain as any)._gainNode || (toneGain as any).input || toneGain;
  if (rawNode) {
    rawNode.channelCount = count;
    rawNode.channelCountMode = 'explicit';
    rawNode.channelInterpretation = 'speakers';
  }
}

function applyDownstreamMonoBranches(): void {
  if (!stereoBranchGain || !monoBranchGain) return;
  const useDownstreamMono = currentIsMono && !workletHandlesMono;
  stereoBranchGain.gain.rampTo(useDownstreamMono ? 0.0 : 1.0, 0.015);
  monoBranchGain.gain.rampTo(useDownstreamMono ? 1.0 : 0.0, 0.015);
}

export function setMasterMonoWorkletActive(active: boolean): void {
  if (workletHandlesMono === active) return;
  workletHandlesMono = active;
  applyDownstreamMonoBranches();
}

export function initMasterMonoNodes(sourceNode: any): void {
  if (stereoBranchGain) {
    try { stereoBranchGain.dispose(); } catch (_) {}
  }
  if (monoBranchGain) {
    try { monoBranchGain.dispose(); } catch (_) {}
  }
  if (monoSummingNode) {
    try { monoSummingNode.dispose(); } catch (_) {}
  }

  const useDownstreamMono = currentIsMono && !workletHandlesMono;

  stereoBranchGain = new Tone.Gain(useDownstreamMono ? 0.0 : 1.0);
  setToneGainChannels(stereoBranchGain, 2);

  monoSummingNode = new Tone.Gain(1.0);
  setToneGainChannels(monoSummingNode, 1);

  monoBranchGain = new Tone.Gain(useDownstreamMono ? 1.0 : 0.0);
  setToneGainChannels(monoBranchGain, 2);

  Tone.connect(sourceNode, stereoBranchGain);
  Tone.connect(sourceNode, monoSummingNode);
  monoSummingNode.connect(monoBranchGain);

  stereoBranchGain.toDestination();
  monoBranchGain.toDestination();
}

export function setMasterMonoCheck(isMono: boolean): void {
  currentIsMono = isMono;
  applyDownstreamMonoBranches();
}

export function isMasterMonoActive(): boolean {
  return currentIsMono;
}

export function disposeMasterMonoNodes(): void {
  try { stereoBranchGain?.dispose(); } catch (_) {}
  try { monoBranchGain?.dispose(); } catch (_) {}
  try { monoSummingNode?.dispose(); } catch (_) {}
  stereoBranchGain = null;
  monoBranchGain = null;
  monoSummingNode = null;
  workletHandlesMono = false;
}
