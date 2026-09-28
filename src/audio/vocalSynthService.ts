/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { audioEngine } from '../hooks/useAudioSync';
import { useAudioStore } from '../stores/useAudioStore';

let fallbackPolySynth: Tone.PolySynth | null = null;

/**
 * Assure le déverrouillage et le démarrage du contexte audio Web Audio / Tone.js
 */
export const ensureAudioContextRunning = async (): Promise<void> => {
  if (!useAudioStore.getState().isAudioUnlocked) {
    useAudioStore.getState().unlockAudio();
  }
  try {
    if (Tone.context && Tone.context.state !== 'running') {
      await Tone.context.resume().catch(() => {});
      await Tone.start().catch(() => {});
    }
  } catch (_) {}
};

/**
 * Déclenche une note de voix en direct avec garantie de son immédiat :
 * - Déverrouille l'AudioContext sur le geste utilisateur
 * - Utilise audioEngine s'il est prêt
 * - Utilise un synthétiseur PolySynth autonome de repli si audioEngine est en cours de montage
 */
export const playVoicePitchLive = (note: string, velocity: number = 0.85): void => {
  ensureAudioContextRunning();

  // 1. Tenter via audioEngine
  if (audioEngine) {
    try {
      audioEngine.triggerVoicePitch(note, velocity);
      return;
    } catch (_) {}
  }

  // 2. Repli autonome Tone.PolySynth garanti
  try {
    if (!fallbackPolySynth) {
      fallbackPolySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.85, release: 0.15 },
      });
      fallbackPolySynth.maxPolyphony = 32;
      fallbackPolySynth.volume.value = -4;
      const dest = Tone.getDestination ? Tone.getDestination() : (Tone as any).Destination;
      try {
        fallbackPolySynth.connect(dest as any);
      } catch (_) {
        try { fallbackPolySynth.toDestination(); } catch (_) {}
      }
    }
    try {
      fallbackPolySynth.triggerRelease([note], Tone.now());
    } catch (_) {}
    fallbackPolySynth.triggerAttack(note, Tone.now(), Math.max(0.2, Math.min(1.0, velocity)));
  } catch (err) {
    console.warn('Vocal live pitch fallback error:', err);
  }
};

/**
 * Relâche une note de voix en direct (extinction de tenue)
 */
export const releaseVoicePitchLive = (note?: string): void => {
  if (audioEngine) {
    try {
      audioEngine.releaseVoicePitch(note);
    } catch (_) {}
  }
  if (fallbackPolySynth) {
    try {
      if (note) {
        fallbackPolySynth.triggerRelease([note], Tone.now());
      } else {
        fallbackPolySynth.releaseAll();
      }
    } catch (_) {}
  }
};
