/**
 * O Girador - Audio Engine Voice Stealing Algorithms
 */

import { ActiveVoice, ALFAIA_INSTRUMENTS } from './engineTypes';

export class EngineVoiceStealing {
  public static stealOldestAlfaia(
    instrumentVoices: Map<string, ActiveVoice[]>,
    time: number
  ): void {
    let totalVoices = 0;
    for (const id of ALFAIA_INSTRUMENTS) {
      const voices = instrumentVoices.get(id);
      if (voices) totalVoices += voices.length;
    }
    if (totalVoices < 16) return;

    let oldestVoice: ActiveVoice | null = null;
    let oldestVoiceIdx = -1;
    let oldestInstId = '';

    for (const id of ALFAIA_INSTRUMENTS) {
      const voices = instrumentVoices.get(id);
      if (voices) {
        for (let i = 0; i < voices.length; i++) {
          const voice = voices[i];
          if (!oldestVoice || voice.time < oldestVoice.time) {
            oldestVoice = voice;
            oldestVoiceIdx = i;
            oldestInstId = id;
          }
        }
      }
    }

    if (oldestVoice) {
      try {
        const gainParam = oldestVoice.gainNode.gain;
        gainParam.cancelScheduledValues(time);
        gainParam.setValueAtTime(gainParam.value, time);
        gainParam.linearRampToValueAtTime(0, time + 0.010);
        oldestVoice.source.stop(time + 0.010);
      } catch (_) {
        try { oldestVoice.source.stop(time); } catch (_) {}
      }
      const origVoices = instrumentVoices.get(oldestInstId);
      if (origVoices && oldestVoiceIdx !== -1) origVoices.splice(oldestVoiceIdx, 1);
      oldestVoice.source = null as any;
      oldestVoice.gainNode = null as any;
      oldestVoice.instrumentId = '';
    }
  }

  public static stealOldestStandard(
    instrumentVoices: Map<string, ActiveVoice[]>,
    instrumentId: string,
    limit: number,
    time: number
  ): void {
    const voices = instrumentVoices.get(instrumentId) || [];
    while (voices.length >= limit) {
      const oldestVoice = voices.shift();
      if (oldestVoice) {
        try {
          const gainParam = oldestVoice.gainNode.gain;
          gainParam.cancelScheduledValues(time);
          gainParam.setValueAtTime(gainParam.value, time);
          gainParam.linearRampToValueAtTime(0, time + 0.012);
          oldestVoice.source.stop(time + 0.012);
        } catch (_) {
          try { oldestVoice.source.stop(time); } catch (_) {}
        }
        oldestVoice.source = null as any;
        oldestVoice.gainNode = null as any;
        oldestVoice.instrumentId = '';
      }
    }
    instrumentVoices.set(instrumentId, voices);
  }
}
