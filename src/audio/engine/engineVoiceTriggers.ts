/**
 * O Girador - Audio Engine Vocal Note Triggers & Pitch Routing
 */

import { getTone } from '../../ToneLoader';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { EngineVoiceSynthManager } from './engineVoiceSynth';
import { EngineVoiceAttack } from './engineVoiceAttack';

export class EngineVoiceTriggers {
  public static triggerVoicePitch(
    audioContext: AudioContext,
    voiceSynthManager: EngineVoiceSynthManager,
    pitch: string | number,
    velocity: number = 0.8,
    targetTrackId?: string | number
  ): void {
    try {
      const Tone = getTone();
      if (!Tone) return;

      if (audioContext.state !== 'running') audioContext.resume().catch(() => {});
      if (Tone.context && Tone.context.state !== 'running') {
        if (typeof (Tone.context as any).resume === 'function') (Tone.context as any).resume().catch(() => {});
        Tone.start().catch(() => {});
      }

      const effectiveTrackId = targetTrackId !== undefined && targetTrackId !== null
        ? targetTrackId
        : (useSequencerStore.getState().editingTrackId ?? 'default');
      const synth = voiceSynthManager.getOrCreateVoiceSynth(effectiveTrackId);
      if (!synth) return;

      const note = typeof pitch === 'number' && pitch <= 127
        ? Tone.Frequency(pitch, 'midi').toNote()
        : pitch;
      const vel = Math.max(0.1, Math.min(1.0, velocity));
      try { synth.triggerRelease([note], Tone.now()); } catch (_) {}
      synth.triggerAttack(note, Tone.now(), vel);
    } catch (err) {
      console.error('AudioEngine.triggerVoicePitch error:', err);
    }
  }

  public static triggerVoiceAttackRelease(
    audioContext: AudioContext,
    voiceSynthManager: EngineVoiceSynthManager,
    pitch: string | number,
    duration: number | string,
    time?: number,
    velocity: number = 0.8,
    targetTrackId?: string | number
  ): void {
    EngineVoiceAttack.trigger(audioContext, voiceSynthManager, pitch, duration, time, velocity, targetTrackId);
  }

  public static releaseVoicePitch(
    voiceSynthManager: EngineVoiceSynthManager,
    pitch?: string | number,
    targetTrackId?: string | number
  ): void {
    try {
      const Tone = getTone();
      if (!Tone) return;

      const resolveNote = (p: string | number) =>
        typeof p === 'number' && p <= 127 ? Tone.Frequency(p, 'midi').toNote() : p;

      if (targetTrackId !== undefined && targetTrackId !== null) {
        const synth = voiceSynthManager.voiceSynths.get(String(targetTrackId));
        if (synth) {
          if (pitch !== undefined && pitch !== null && pitch !== '') {
            synth.triggerRelease([resolveNote(pitch)], Tone.now());
          } else {
            synth.releaseAll(Tone.now());
          }
        }
      } else {
        voiceSynthManager.voiceSynths.forEach((synth) => {
          try {
            if (pitch !== undefined && pitch !== null && pitch !== '') {
              synth.triggerRelease([resolveNote(pitch)], Tone.now());
            } else {
              synth.releaseAll(Tone.now());
            }
          } catch (_) {}
        });
        if (voiceSynthManager.voiceSynth) {
          try {
            if (pitch !== undefined && pitch !== null && pitch !== '') {
              voiceSynthManager.voiceSynth.triggerRelease([resolveNote(pitch)], Tone.now());
            } else {
              voiceSynthManager.voiceSynth.releaseAll(Tone.now());
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('AudioEngine.releaseVoicePitch error:', err);
    }
  }
}
