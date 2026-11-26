/**
 * O Girador - Audio Engine Vocal Attack Release Trigger
 */

import { getTone } from '../../ToneLoader';
import { useSequencerStore } from '../../stores/useSequencerStore';
import type { VoiceMelismaGlide } from '../../utils/musicTheory';
import { sanitizeVoiceDuration, sanitizeVoiceTime, VOICE_FALLBACK_DURATION_SEC } from '../voiceNoteGuard';
import { wakeAudioContextForNotePreview } from '../audioContextSuspendManager';
import { EngineVoiceSynthManager } from './engineVoiceSynth';
import { EngineLegatoVoice } from './engineLegatoVoice';

export class EngineVoiceAttack {
  public static trigger(
    audioContext: AudioContext,
    voiceSynthManager: EngineVoiceSynthManager,
    pitch: string | number,
    duration: number | string,
    time?: number,
    velocity: number = 0.7,
    targetTrackId?: string | number,
    melismaGlides?: VoiceMelismaGlide[]
  ): void {
    try {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__LAST_VOICE_ATTACK__ = { pitch, duration, time, velocity, targetTrackId, melismaGlides, timestamp: Date.now() };
        if (Array.isArray(win.__VOICE_ATTACK_HISTORY__) && win.__VOICE_ATTACK_HISTORY__.length < 64) {
          win.__VOICE_ATTACK_HISTORY__.push({ pitch, duration, time, velocity, targetTrackId, melismaGlides });
        }
      }

      const Tone = getTone();
      if (!Tone) return;
      wakeAudioContextForNotePreview(audioContext);

      const effectiveTrackId = targetTrackId !== undefined && targetTrackId !== null
        ? targetTrackId
        : (useSequencerStore.getState().editingTrackId ?? 'default');

      const note = typeof pitch === 'number' && pitch <= 127
        ? Tone.Frequency(pitch, 'midi').toNote()
        : pitch;

      const vel = Math.max(0.1, Math.min(1.0, velocity));
      const triggerTime = sanitizeVoiceTime(time !== undefined ? time : Tone.now(), Tone.now());
      const rawDur = typeof duration === 'string' && Tone.Time ? Tone.Time(duration).toSeconds() : duration;
      const dur = sanitizeVoiceDuration(rawDur);
      if (dur === VOICE_FALLBACK_DURATION_SEC && rawDur !== VOICE_FALLBACK_DURATION_SEC) {
        console.warn('AudioEngine.triggerVoiceAttackRelease: durée invalide, repli sûr appliqué', rawDur);
      }

      if (melismaGlides && melismaGlides.length > 0) {
        if (EngineLegatoVoice.triggerLegatoPhrase(voiceSynthManager, effectiveTrackId, String(note), dur, triggerTime, vel, melismaGlides)) {
          return;
        }
      }

      const synth = voiceSynthManager.getOrCreateVoiceSynth(effectiveTrackId);
      if (!synth) return;

      const overlapKey = `${String(effectiveTrackId)}|${String(note)}`;
      if (voiceSynthManager.voiceOverlap.registerAndCheck(overlapKey, triggerTime, dur)) {
        try { synth.triggerRelease([note], triggerTime); } catch (_) {}
      }

      try {
        synth.triggerAttackRelease(note, dur, triggerTime, vel);
      } catch (attackErr) {
        try { synth.triggerRelease([note], triggerTime + dur); } catch (_) {}
        throw attackErr;
      }
    } catch (err) {
      console.error('AudioEngine.triggerVoiceAttackRelease error:', err);
    }
  }
}
