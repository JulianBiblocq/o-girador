import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as nodes from './effectsChainNodes';

let deferredReverbActivation = false;

export function getDeferredReverbActivation(): boolean {
  return deferredReverbActivation;
}

export function setDeferredReverbActivation(val: boolean) {
  deferredReverbActivation = val;
}

export function ensureReverbConnected() {
  if (!nodes.masterReverbVolumeNode) return;

  const masterFX = useSequencerStore.getState().masterFX;
  const shouldBypass = masterFX.reverb.isMuted || masterFX.reverb.returnVolume === 0;

  if (!nodes.reverbNode) {
    try {
      const savedDecay = localStorage.getItem('oGirador_reverb_decay');
      const decay = savedDecay ? parseFloat(savedDecay) : 2.5;
      const rev = new Tone.Reverb({ decay, preDelay: 0.02, wet: 1 }).connect(nodes.masterReverbVolumeNode);
      if (nodes.reverbBusReceive && !shouldBypass) {
        nodes.reverbBusReceive.connect(rev);
      }
      nodes.setReverbNode(rev);
    } catch (err) {
      console.error("Failed to instantiate and connect Reverb:", err);
    }
  } else {
    try {
      nodes.reverbNode.disconnect();
      nodes.reverbNode.connect(nodes.masterReverbVolumeNode);
      if (nodes.reverbBusReceive) {
        try { nodes.reverbBusReceive.disconnect(nodes.reverbNode); } catch (_) {}
        if (!shouldBypass) nodes.reverbBusReceive.connect(nodes.reverbNode);
      }
    } catch (_) {}
  }

  const savedVol = localStorage.getItem('oGirador_master_reverb_vol');
  const masterReverbVol = savedVol ? parseFloat(savedVol) : 0;
  nodes.masterReverbVolumeNode.gain.value = Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol);
}

export function handleReverbEcoToggle(isEco: boolean, isPlaying: boolean) {
  if (isEco) {
    if (nodes.reverbNode) {
      if (isPlaying) {
        if (nodes.masterReverbVolumeNode) nodes.masterReverbVolumeNode.gain.rampTo(0, 0.01);
        setTimeout(() => {
          if (nodes.reverbNode) {
            try { nodes.reverbNode.disconnect(); } catch (_) {}
          }
        }, 15);
      } else {
        try { nodes.reverbNode.disconnect(); } catch (_) {}
      }
    }
  } else {
    if (isPlaying) deferredReverbActivation = true;
    else ensureReverbConnected();
  }
}
