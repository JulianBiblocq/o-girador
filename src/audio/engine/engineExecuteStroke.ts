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
    track: TrackGroup | null,
    requestedSymbol?: string
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

    // Élimination du voice stealing arbitraire et étouffement strictement isolé par piste (trackId)
    deps.voiceGuard.chokeTrackVoice(trackId, requestedSymbol || stroke.symbol, time);

    const isLeftHandRufada = (requestedSymbol || stroke.symbol) === 'r';
    const finalVelocity = isLeftHandRufada ? velocity * 0.88 : velocity;
    const pitchNuance = isLeftHandRufada ? 0.985 : 1.0;
    const calculatedPitch = EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning) * pitchNuance;
    EngineStrokePlayback.play(
      deps.playbackCtx, trackId, instrumentId, stroke,
      buffer.get() as AudioBuffer, calculatedPitch, time, finalVelocity, decayMultiplier, isLiveHold
    );

    if (instrumentId === 'apito') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => {
        window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
      }, time);
    }
  }
}
