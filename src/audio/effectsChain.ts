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
export let masterReverbVolumeNode: Tone.Gain | null = null;
export let reverbNode: Tone.Reverb | null = null;
export let metroChannel: Tone.Channel | null = null;

export const channels: { [id: string]: Tone.Channel } = {};
export const meters: { [id: string]: Tone.Meter } = {};
export const reverbSends: { [id: string]: Tone.Gain } = {};

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
  masterLimiterNode.connect(Tone.Destination);
  
  const baseGain = Tone.dbToGain(masterVol === -40 ? -Infinity : masterVol);
  const multiplier = isEco ? Tone.dbToGain(-8) : 1.0;
  masterVolumeNode.gain.value = baseGain * multiplier;
  
  masterMeterNode = new Tone.Meter();
  (window as any).masterMeterNode = masterMeterNode;
  Tone.Destination.connect(masterMeterNode);

  // Metronome channel
  metroChannel = new Tone.Channel({ volume: Tone.gainToDb(metroVolume / 100) }).connect(masterVolumeNode);
  metroChannel.mute = !isMetroOn;

  // Reverb nodes
  masterReverbVolumeNode = new Tone.Gain(Tone.dbToGain(masterReverbVol === -40 ? -Infinity : masterReverbVol)).connect(masterVolumeNode);
  if (!isEco) {
    reverbNode = new Tone.Reverb({ decay: 2.5, preDelay: 0.02, wet: 1 }).connect(masterReverbVolumeNode);
  } else {
    reverbNode = null;
  }
}

export function initInstrumentNodes() {
  if (!masterVolumeNode) return;

  instrumentsConfig.forEach((inst) => {
    if (!channels[inst.id]) {
      channels[inst.id] = new Tone.Channel({ volume: 0 }).connect(masterVolumeNode!);
    }
    if (!meters[inst.id]) {
      meters[inst.id] = new Tone.Meter();
      channels[inst.id].connect(meters[inst.id]);
    }
    if (!reverbSends[inst.id]) {
      reverbSends[inst.id] = new Tone.Gain(0);
      channels[inst.id].connect(reverbSends[inst.id]);
      if (reverbNode) {
        reverbSends[inst.id].connect(reverbNode);
      }
    }
  });
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

  if (!reverbNode) {
    try {
      const savedDecay = localStorage.getItem('oGirador_reverb_decay');
      const decay = savedDecay ? parseFloat(savedDecay) : 2.5;
      
      reverbNode = new Tone.Reverb({ decay, preDelay: 0.02, wet: 1 }).connect(masterReverbVolumeNode);

      // Reconnect all instrument sends to the new reverbNode
      Object.entries(reverbSends).forEach(([id, sendNode]) => {
        try {
          sendNode.disconnect();
          sendNode.connect(reverbNode!);
        } catch (e) {
          console.warn(`Error connecting reverb send for ${id}:`, e);
        }
      });
    } catch (err) {
      console.error("Failed to instantiate and connect Reverb:", err);
    }
  } else {
    try {
      reverbNode.disconnect();
      reverbNode.connect(masterReverbVolumeNode);
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

