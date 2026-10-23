/**
 * Module de commutation Mono Check Master sans clic audio (< 90 lignes).
 */
import * as Tone from 'tone';

let stereoBranchGain: Tone.Gain | null = null;
let monoSummingNode: Tone.Gain | null = null;
let monoBranchGain: Tone.Gain | null = null;
let currentIsMono = false;

function setToneGainChannels(toneGain: Tone.Gain, count: number) {
  const rawNode = (toneGain as any)._gainNode || (toneGain as any).input || toneGain;
  if (rawNode) {
    rawNode.channelCount = count;
    rawNode.channelCountMode = 'explicit';
    rawNode.channelInterpretation = 'speakers';
  }
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

  // 1. Branche Stereo directe
  stereoBranchGain = new Tone.Gain(currentIsMono ? 0.0 : 1.0);
  setToneGainChannels(stereoBranchGain, 2);

  // 2. Branche Mono sommatrice W3C (0.5 * (L + R) redistribue sur L et R)
  monoSummingNode = new Tone.Gain(1.0);
  setToneGainChannels(monoSummingNode, 1);

  monoBranchGain = new Tone.Gain(currentIsMono ? 1.0 : 0.0);
  setToneGainChannels(monoBranchGain, 2);

  Tone.connect(sourceNode, stereoBranchGain);
  Tone.connect(sourceNode, monoSummingNode);
  monoSummingNode.connect(monoBranchGain);

  stereoBranchGain.toDestination();
  monoBranchGain.toDestination();
}

export function setMasterMonoCheck(isMono: boolean): void {
  currentIsMono = isMono;
  if (!stereoBranchGain || !monoBranchGain) return;

  const targetStereo = isMono ? 0.0 : 1.0;
  const targetMono = isMono ? 1.0 : 0.0;

  // Ancrage strict des rampes Web Audio pour commutation fluide sans clic
  stereoBranchGain.gain.rampTo(targetStereo, 0.015);
  monoBranchGain.gain.rampTo(targetMono, 0.015);
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
}
