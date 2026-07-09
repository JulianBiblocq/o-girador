/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { instrumentsConfig } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';

/*
 * JUSTIFICATION DES CHOIX TECHNIQUES (Performance & Horloge Audio) :
 * 1. Zero Render Thrashing / Zero Layout Thrashing : L'ensemble de la chaîne d'effets Master 
 *    et des canaux d'instruments est instancié à la racine du module, hors du cycle de vie React.
 *    Cela évite toute recréation de nœuds lors des re-renders, éliminant les recalculs de layout (reflow)
 *    et les cycles de paint coûteux sur le Main Thread.
 * 2. Stabilité Audio : Le fait de garder des instances statiques uniques empêche l'interruption
 *    du flux audio de Tone.js (pas de coupure de son ou de clic audio suite au Garbage Collection).
 */

export let masterVolumeNode: Tone.Gain | null = null;
export let masterEQNode: Tone.EQ3 | null = null;
export let masterCompressorNode: Tone.Compressor | null = null;
export let masterSoftClipperNode: Tone.WaveShaper | null = null;
export let masterMeterNode: Tone.Meter | null = null;
export let masterLeftMeterNode: Tone.Meter | null = null;
export let masterRightMeterNode: Tone.Meter | null = null;
export let masterReverbVolumeNode: Tone.Gain | null = null;
export let reverbNode: Tone.Reverb | null = null;
export let distortionNode: Tone.Distortion | null = null;
export let masterDistortionVolumeNode: Tone.Gain | null = null;
export let reverbBusReceive: Tone.Channel | null = null;
export let distortionBusReceive: Tone.Channel | null = null;
export let metroChannel: Tone.Channel | null = null;

export const channels: { [trackId: number]: Tone.Channel } = {};
export const meters: { [trackId: number]: Tone.Meter } = {};
export const reverbSends: { [trackId: number]: any } = {};
export const distortionSends: { [trackId: number]: any } = {};
export const trackInputs: { [trackId: number]: Tone.Gain } = {};
export const lowCutNodes: { [trackId: number]: Tone.Filter } = {};
export const eqNodes: { 
  [trackId: number]: {
    low: Tone.Filter;
    mid: Tone.Filter;
    high: Tone.Filter;
  }
} = {};
export const busChannels: {
  [busId: string]: Tone.Channel;
} = {};
export const busMeters: { [busId: string]: Tone.Meter } = {};

export function initMasterEffectsChain(
  masterVol: number,
  masterEQ: { low: number; mid: number; high: number },
  isEco: boolean,
  masterReverbVol: number,
  metroVolume: number,
  isMetroOn: boolean
) {
  if (masterVolumeNode) return; // Déjà initialisé

  if (!Tone.context) {
    let rawCtx: AudioContext;
    try {
      rawCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'playback',
        sampleRate: 44100
      });
    } catch (_) {
      rawCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'playback'
      });
    }
    Tone.setContext(new Tone.Context(rawCtx));
  }

  masterEQNode = new Tone.EQ3({
    low: masterEQ.low,
    mid: masterEQ.mid,
    high: masterEQ.high
  });

  masterCompressorNode = new Tone.Compressor({
    threshold: isEco ? 0 : -12, // Compression douce pour ne pas saturer sur mobile
    ratio: isEco ? 1 : 2,
    attack: 0.015,
    release: 0.15
  });

  masterVolumeNode = new Tone.Gain(1.0);
  try {
    masterVolumeNode.channelCount = 2;
    masterVolumeNode.channelCountMode = "explicit";
  } catch (err) {
    console.warn("Could not set channelCount / channelCountMode on masterVolumeNode:", err);
  }
  masterVolumeNode.connect(masterEQNode);
  masterEQNode.connect(masterCompressorNode);
  
  const masterHighpassNode = new Tone.Filter(55, 'highpass');
  masterCompressorNode.connect(masterHighpassNode);

  const masterLimiterNode = new Tone.Limiter(-2);
  masterHighpassNode.connect(masterLimiterNode);

  masterSoftClipperNode = new Tone.WaveShaper();
  const curveSize = 8192;
  const clipperCurve = new Float32Array(curveSize);
  for (let i = 0; i < curveSize; i++) {
    const x = (2 * i) / (curveSize - 1) - 1;
    let y = (3 * x - Math.pow(x, 3)) / 2;
    if (x <= -1) {
      y = -1.0;
    } else if (x >= 1) {
      y = 1.0;
    }
    clipperCurve[i] = y;
  }
  masterSoftClipperNode.curve = clipperCurve;
  masterSoftClipperNode.oversample = '4x';
  // Connect masterLimiterNode directly to Tone.Destination to prevent master intermodulation/harmonic distortion
  try {
    Tone.Destination.channelCount = 2;
    Tone.Destination.channelCountMode = "explicit";
  } catch (err) {
    console.warn("Could not set channelCount / channelCountMode on Tone.Destination:", err);
  }
  masterLimiterNode.connect(Tone.Destination);
  
  const baseGain = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
  const multiplier = isEco ? Tone.dbToGain(-8) : 1.0;
  masterVolumeNode.gain.value = baseGain * multiplier;
  
  masterMeterNode = new Tone.Meter({ channels: 2 });
  (window as any).masterMeterNode = masterMeterNode;
  masterLimiterNode.connect(masterMeterNode);

  // Stereo split for dedicated left/right meters connected to Tone.getDestination()
  const masterSplit = new Tone.Split(2);
  Tone.getDestination().connect(masterSplit);

  masterLeftMeterNode = new Tone.Meter();
  masterRightMeterNode = new Tone.Meter();
  masterSplit.connect(masterLeftMeterNode, 0);
  masterSplit.connect(masterRightMeterNode, 1);

  (window as any).masterLeftMeterNode = masterLeftMeterNode;
  (window as any).masterRightMeterNode = masterRightMeterNode;

  // Metronome channel
  metroChannel = new Tone.Channel({ volume: Tone.gainToDb(metroVolume / 100) }).connect(masterVolumeNode);
  metroChannel.mute = !isMetroOn;

  // Reverb nodes connected in parallel to masterVolumeNode
  masterReverbVolumeNode = new Tone.Gain(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol)).connect(masterVolumeNode);
  
  reverbBusReceive = new Tone.Channel();
  reverbBusReceive.receive("reverb");

  if (!isEco) {
    reverbNode = new Tone.Reverb({ decay: 2.5, preDelay: 0.02, wet: 1 }).connect(masterReverbVolumeNode);
    reverbBusReceive.connect(reverbNode);
  } else {
    reverbNode = null;
  }

  // Distortion nodes (light distortion) connected in parallel to masterVolumeNode
  distortionNode = new Tone.Distortion({ distortion: 0.15, wet: 1 });
  masterDistortionVolumeNode = new Tone.Gain(1.0).connect(masterVolumeNode);
  distortionNode.connect(masterDistortionVolumeNode);

  distortionBusReceive = new Tone.Channel();
  distortionBusReceive.receive("distortion");
  distortionBusReceive.connect(distortionNode);
}

export function initInstrumentNodes() {
  // Les nœuds sont instanciés dynamiquement par track.id dans useAudioSync.ts
}

let deferredReverbActivation = false;

export function getDeferredReverbActivation(): boolean {
  return deferredReverbActivation;
}

export function setDeferredReverbActivation(val: boolean) {
  deferredReverbActivation = val;
}

export function ensureReverbConnected() {
  if (!masterReverbVolumeNode) return;

  const masterFX = useSequencerStore.getState().masterFX;
  const shouldBypass = masterFX.reverb.isMuted || masterFX.reverb.returnVolume === 0;

  if (!reverbNode) {
    try {
      const savedDecay = localStorage.getItem('oGirador_reverb_decay');
      const decay = savedDecay ? parseFloat(savedDecay) : 2.5;
      
      reverbNode = new Tone.Reverb({ decay, preDelay: 0.02, wet: 1 }).connect(masterReverbVolumeNode);
      if (reverbBusReceive && !shouldBypass) {
        reverbBusReceive.connect(reverbNode);
      }
    } catch (err) {
      console.error("Failed to instantiate and connect Reverb:", err);
    }
  } else {
    try {
      reverbNode.disconnect();
      reverbNode.connect(masterReverbVolumeNode);
      if (reverbBusReceive) {
        try {
          reverbBusReceive.disconnect(reverbNode);
        } catch (_) {}
        if (!shouldBypass) {
          reverbBusReceive.connect(reverbNode);
        }
      }
    } catch (e) {
      console.warn("Error reconnecting reverbNode:", e);
    }
  }

  // Restore the gain of masterReverbVolumeNode
  const savedVol = localStorage.getItem('oGirador_master_reverb_vol');
  const masterReverbVol = savedVol ? parseFloat(savedVol) : 0;
  masterReverbVolumeNode.gain.value = Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol);
}

export function handleReverbEcoToggle(isEco: boolean, isPlaying: boolean) {
  if (isEco) {
    // Turn Eco Mode ON: Deactivate Reverb
    if (reverbNode) {
      if (isPlaying) {
        // Sécurité Anti-Clic : Rampe rapide de gain vers 0 en 10ms
        if (masterReverbVolumeNode) {
          masterReverbVolumeNode.gain.rampTo(0, 0.01); // 10ms = 0.01s
        }
        setTimeout(() => {
          if (reverbNode) {
            try {
              reverbNode.disconnect();
            } catch (e) {
              console.warn("Error disconnecting reverbNode:", e);
            }
          }
        }, 15);
      } else {
        try {
          reverbNode.disconnect();
        } catch (e) {
          console.warn("Error disconnecting reverbNode:", e);
        }
      }
    }
  } else {
    // Turn Eco Mode OFF: Activate Reverb
    if (isPlaying) {
      // Defer activation
      deferredReverbActivation = true;
    } else {
      // Activate immediately
      ensureReverbConnected();
    }
  }
}

export function syncTrackInsertChain(trackId: number, track: any) {
  const isMobile = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;

  const inputNode = trackInputs[trackId];
  const channelNode = channels[trackId];
  if (!inputNode || !channelNode) return;

  // 1. Disconnect input and active inserts
  inputNode.disconnect();
  
  const lowCutNode = lowCutNodes[trackId];
  if (lowCutNode) {
    lowCutNode.disconnect();
  }
  
  const eqNodeGroup = eqNodes[trackId];
  if (eqNodeGroup) {
    eqNodeGroup.low.disconnect();
    eqNodeGroup.mid.disconnect();
    eqNodeGroup.high.disconnect();
  }

  // If mobile, bypass EQ & Low-Cut completely (they remain uninstantiated)
  if (isMobile) {
    inputNode.connect(channelNode);
    return;
  }

  // Check state
  const hasLowCut = !!track.lowCut;
  const eq = track.eqBands;
  const hasEQ = eq ? (
    (eq.low?.g !== undefined && eq.low.g !== 0) ||
    (eq.mid?.g !== undefined && eq.mid.g !== 0) ||
    (eq.high?.g !== undefined && eq.high.g !== 0)
  ) : false;

  // Instantiate nodes if they don't exist yet
  let currentLowCut = lowCutNodes[trackId];
  if (hasLowCut && !currentLowCut) {
    // Note: Tone.Filter wraps Web Audio API's BiquadFilterNode (highpass)
    currentLowCut = new Tone.Filter(80, "highpass");
    lowCutNodes[trackId] = currentLowCut;
  }

  let currentEQ = eqNodes[trackId];
  if (hasEQ && !currentEQ) {
    currentEQ = {
      low: new Tone.Filter(eq?.low?.f || 100, "lowshelf"),
      mid: new Tone.Filter(eq?.mid?.f || 1000, "peaking"),
      high: new Tone.Filter(eq?.high?.f || 8000, "highshelf")
    };
    eqNodes[trackId] = currentEQ;
  }

  // Update parameters if nodes exist
  if (currentEQ && eq) {
    currentEQ.low.frequency.value = eq.low?.f ?? 100;
    currentEQ.low.gain.value = eq.low?.g ?? 0;

    currentEQ.mid.frequency.value = eq.mid?.f ?? 1000;
    currentEQ.mid.gain.value = eq.mid?.g ?? 0;
    currentEQ.mid.Q.value = eq.mid?.q === 'narrow' ? 2.0 : 0.7;

    currentEQ.high.frequency.value = eq.high?.f ?? 8000;
    currentEQ.high.gain.value = eq.high?.g ?? 0;
  }

  // Connect the active chain (Smart Bypass)
  let lastNode: any = inputNode;

  if (hasLowCut && currentLowCut) {
    lastNode.connect(currentLowCut);
    lastNode = currentLowCut;
  }

  if (hasEQ && currentEQ) {
    lastNode.connect(currentEQ.low);
    currentEQ.low.connect(currentEQ.mid);
    currentEQ.mid.connect(currentEQ.high);
    lastNode = currentEQ.high;
  }

  lastNode.connect(channelNode);
}

