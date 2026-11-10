import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as nodes from './effectsChainNodes';
import { createStudioConvolverReverb } from './studioReverbImpulse';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';

let deferredReverbActivation = false;
let isReverbGraphWired = false;

export function getDeferredReverbActivation(): boolean {
  return deferredReverbActivation;
}

export function setDeferredReverbActivation(val: boolean) {
  deferredReverbActivation = val;
}

export function ensureReverbConnected() {
  if (!nodes.masterReverbVolumeNode) return;

  const state = useSequencerStore.getState();
  const masterFX = state.masterFX;
  const fxActive = state.masterEffectsActive || { compressor: true, reverb: true, disto: true };
  const disableFx = Boolean(state.ecoConfig?.disableFx);
  const returnVol = masterFX?.reverb?.returnVolume ?? 70;
  const shouldBypass = disableFx || !fxActive.reverb || Boolean(masterFX?.reverb?.isMuted) || returnVol <= 0;

  if (!nodes.reverbNode) {
    try {
      const rev = createStudioConvolverReverb();
      rev.connect(nodes.masterReverbVolumeNode);
      if (nodes.reverbBusReceive) {
        nodes.reverbBusReceive.connect(rev);
      }
      nodes.setReverbNode(rev);
      isReverbGraphWired = true;
    } catch (err) {
      console.error('Failed to instantiate and connect Studio Convolver Reverb:', err);
    }
  } else if (!isReverbGraphWired) {
    try {
      nodes.reverbNode.connect(nodes.masterReverbVolumeNode);
      if (nodes.reverbBusReceive) {
        nodes.reverbBusReceive.connect(nodes.reverbNode);
      }
      isReverbGraphWired = true;
    } catch (_) {}
  }

  const returnDb = returnVol <= 0 ? -100 : 40 * Math.log10(Math.max(0.00001, returnVol / 100));
  const rawLinear = (shouldBypass || returnDb <= -99 || !Number.isFinite(returnDb))
    ? 0
    : Tone.dbToGain(returnDb);
  const targetGain = Number.isFinite(rawLinear) ? Math.max(0, Math.min(4, rawLinear)) : 0;
  safeRampTo(nodes.masterReverbVolumeNode.gain, targetGain, 0.025, 0, 4);
}

export function handleReverbEcoToggle(isEco: boolean, _isPlaying: boolean) {
  if (!nodes.reverbNode) {
    ensureReverbConnected();
  }
  if (isEco) {
    if (nodes.masterReverbVolumeNode) {
      safeRampTo(nodes.masterReverbVolumeNode.gain, 0, 0.025, 0, 4);
    }
  } else {
    ensureReverbConnected();
  }
}
