/**
 * O Girador - Audio Engine Vocal Attack Release Trigger
 */

import { getTone } from '../../ToneLoader';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { sanitizeVoiceDuration, sanitizeVoiceTime, VOICE_FALLBACK_DURATION_SEC } from '../voiceNoteGuard';
import { EngineVoiceSynthManager } from './engineVoiceSynth';

export class EngineVoiceAttack {
  public static trigger(
    audioContext: AudioContext,
    voiceSynthManager: EngineVoiceSynthManager,
    pitch: string | number,
    duration: number | string,
    time?: number,
    velocity: number = 0.8,
    targetTrackId?: string | number
  ): void {
    try {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__LAST_VOICE_ATTACK__ = { pitch, duration, time, velocity, targetTrackId, timestamp: Date.now() };
        win.__VOICE_ATTACK_HISTORY__ = win.__VOICE_ATTACK_HISTORY__ || [];
        win.__VOICE_ATTACK_HISTORY__.push({ pitch, duration, time, velocity, targetTrackId });
      }

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
      const triggerTime = sanitizeVoiceTime(time !== undefined ? time : Tone.now(), Tone.now());
      const rawDur = typeof duration === 'string' && Tone.Time ? Tone.Time(duration).toSeconds() : duration;
      const dur = sanitizeVoiceDuration(rawDur);
      if (dur === VOICE_FALLBACK_DURATION_SEC && rawDur !== VOICE_FALLBACK_DURATION_SEC) {
        console.warn('AudioEngine.triggerVoiceAttackRelease: durée invalide, repli sûr appliqué', rawDur);
      }

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
