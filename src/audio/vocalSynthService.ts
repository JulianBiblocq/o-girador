/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { audioEngine } from '../hooks/useAudioSync';
import { useAudioStore } from '../stores/useAudioStore';
import { VocalPresetId, VOCAL_PRESETS } from './vocalPresets';

let fallbackPolySynth: Tone.PolySynth | null = null;

/**
 * Applique immédiatement le preset de timbre vocal au moteur audio actif
 * et au synthétiseur autonome de repli.
 */
export const applyVocalPresetLive = (presetId: VocalPresetId): void => {
  if (audioEngine) {
    try {
      audioEngine.applyVocalPreset(presetId);
    } catch (_) {}
  }

  if (fallbackPolySynth) {
    try {
      fallbackPolySynth.releaseAll();
      fallbackPolySynth.disconnect();
      fallbackPolySynth.dispose();
    } catch (_) {}
    fallbackPolySynth = null;
  }
};

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
      const activePresetId = useAudioStore.getState().vocalPreset || 'guide';
      const presetConfig = VOCAL_PRESETS[activePresetId] || VOCAL_PRESETS.guide;
      const SynthConstructor = presetConfig.synthClass === 'FMSynth' ? Tone.FMSynth : Tone.Synth;

      fallbackPolySynth = new Tone.PolySynth(SynthConstructor as any, {
        maxPolyphony: 32,
        options: presetConfig.options,
        ...presetConfig.options,
      } as any);
      fallbackPolySynth.maxPolyphony = 32;
      fallbackPolySynth.volume.value = -6;
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
