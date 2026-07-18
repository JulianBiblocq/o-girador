/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { metroChannel, masterVolumeNode } from './effectsChain';

/*
 * JUSTIFICATION DES CHOIX TECHNIQUES (Performance & Horloge Audio) :
 * 1. Utilisation d'Oscillateurs Natifs Web Audio : L'utilisation d'oscillateurs natifs 
 *    du navigateur (`ctx.createOscillator()`) à la place de synthétiseurs complexes Tone.js (comme Tone.Synth)
 *    permet de réduire drastiquement le nombre de nœuds audio instanciés et la surcharge CPU associée.
 *    Cela préserve le Main Thread de tout blocage (Zero Render Thrashing) et garantit un framerate stable de 60 FPS.
 * 2. Gestion de l'Horloge Temps Réel : L'ordonnancement est basé sur le temps audio précis de Tone.js,
 *    déconnecté du cycle de rendu de React, garantissant une absence de gigue (jitter) temporelle.
 */

export const activeNativeOscillators = new Set<OscillatorNode>();

export const playNativeMetroClick = (time: number, isAccent: boolean, soundType: string, volume: number) => {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const osc = rawCtx.createOscillator();
  const clickGain = rawCtx.createGain();
  osc.connect(clickGain);
  
  if (metroChannel) {
    Tone.connect(clickGain, metroChannel as any);
  } else if (masterVolumeNode) {
    Tone.connect(clickGain, masterVolumeNode as any);
  } else {
    clickGain.connect(rawCtx.destination);
  }

  const freq = isAccent ? 880 : 440;
  const volumeMultiplier = isAccent ? 1.0 : 0.6;
  const finalVol = volume * volumeMultiplier;

  clickGain.gain.setValueAtTime(0.0001, time);
  clickGain.gain.exponentialRampToValueAtTime(finalVol, time + 0.002);

  if (soundType === 'clave') {
    osc.type = 'sine';
    const targetFreq = isAccent ? 1200 : 800;
    osc.frequency.setValueAtTime(targetFreq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.01);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.09);
  } else if (soundType === 'cowbell') {
    osc.type = 'triangle';
    osc.frequency.value = isAccent ? 587.33 : 440;
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.07);
  } else {
    osc.type = 'square';
    osc.frequency.value = freq;
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      clickGain.disconnect();
    } catch (_) {}
  };
};

export const playNativeVoiceSynth = (freq: number, time: number, duration: number, volume: number, channelNode: any) => {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const osc = rawCtx.createOscillator();
  const voiceGain = rawCtx.createGain();
  osc.connect(voiceGain);

  if (channelNode) {
    Tone.connect(voiceGain, channelNode);
  } else if (masterVolumeNode) {
    Tone.connect(voiceGain, masterVolumeNode as any);
  } else {
    voiceGain.connect(rawCtx.destination);
  }

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.05;
  voiceGain.gain.setValueAtTime(0.0001, time);
  voiceGain.gain.exponentialRampToValueAtTime(volume * 0.3, time + attack);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.start(time);
  osc.stop(time + duration);

  activeNativeOscillators.add(osc);
  osc.onended = () => {
    activeNativeOscillators.delete(osc);
    try {
      osc.disconnect();
      voiceGain.disconnect();
    } catch (_) {}
  };
};

export function stopAllNativeOscillators() {
  activeNativeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (_) {}
  });
  activeNativeOscillators.clear();
}
