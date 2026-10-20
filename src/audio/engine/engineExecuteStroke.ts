/**
 * O Girador - Audio Engine Low-Level Stroke Execution
 */

import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { EngineTuning } from './engineTuning';
import { EngineStrokePlayback } from './engineStrokePlayback';
import { ALFAIA_INSTRUMENTS } from './engineTypes';
import type { NotePlayerDeps } from './enginePlayerTypes';

export class EngineExecuteStroke {
  public static execute(
    deps: NotePlayerDeps,
    trackId: number | null,
    instrumentId: string,
    config: InstrumentAudioConfig,
    stroke: StrokeMapping,
    time: number,
    velocity: number,
    decayMultiplier: number,
    overrideTuning: number | undefined,
    isLiveHold: boolean,
    track: TrackGroup | null
  ): void {
    if (stroke.isBarulho && isLiveHold && deps.playbackCtx.barulho.activeBarulhoNodes.has(instrumentId)) {
      const activeGain = deps.playbackCtx.barulho.activeBarulhoGains.get(instrumentId);
      if (activeGain) {
        try {
          activeGain.gain.cancelScheduledValues(time);
          activeGain.gain.setValueAtTime(activeGain.gain.value, time);
          activeGain.gain.linearRampToValueAtTime(velocity, time + 0.1);
        } catch (_) {}
      }
      return;
    }

    if (!stroke.isBarulho || !isLiveHold) {
      deps.playbackCtx.barulho.stopBarulho(instrumentId, time);
    }

    const filePath = deps.roundRobin.selectFile(instrumentId, stroke, time);
    const buffer = deps.sampleLoader.bufferPool.get(filePath);
    if (!buffer || !buffer.loaded) return;

    if (ALFAIA_INSTRUMENTS.has(instrumentId)) deps.voiceGuard.enforceAlfaiaVoiceLimit(time);
    else deps.voiceGuard.enforceStandardVoiceLimit(instrumentId, time);

    const calculatedPitch = EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning);
    EngineStrokePlayback.play(
      deps.playbackCtx, trackId, instrumentId, stroke,
      buffer.get() as AudioBuffer, calculatedPitch, time, velocity, decayMultiplier, isLiveHold
    );

    if (instrumentId === 'apito') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => {
        window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
      }, time);
    }
  }
}
