/**
 * O Girador - Audio Engine Low-Level Stroke Execution (< 85 lignes)
 * - Lecture phase-continue 100 % naturelle des tambours (`playbackRate = 2^(st/12)`).
 * - Micro-dispersion temporelle d'unisson réservée aux fûts esclaves liés (`isLinkedSlave`).
 * - Combinaison multiplicative sans double division (`effectiveDecayNorm`) de `stepDecay` et `trackDecay`.
 */

import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { EngineTuning } from './engineTuning';
import { EngineStrokePlayback } from './engineStrokePlayback';
import type { NotePlayerDeps } from './enginePlayerTypes';

export function computeEffectiveDecayNorm(
  rawStepDecay: number | undefined,
  rawTrackDecay: number | undefined,
  isPreviewOverride: boolean = false
): number {
  const s = rawStepDecay ?? 1;
  const stepDecayNorm = s > 1 ? s / 100 : s;
  const t = rawTrackDecay ?? 100;
  const trackDecayNorm = t > 1 ? t / 100 : t;
  if (isPreviewOverride && stepDecayNorm < 0.999) {
    return Math.max(0.15, Math.min(1.0, stepDecayNorm));
  }
  return Math.max(0.15, Math.min(1.0, stepDecayNorm * trackDecayNorm));
}

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

    const filePath = deps.roundRobin.selectFile(instrumentId, stroke, time, trackId);
    const bufferEntry = deps.sampleLoader.bufferPool.get(filePath);
    if (!bufferEntry || !bufferEntry.loaded) return;

    const microDelaySec = EngineTuning.calculateUnisonMicroDelaySec(track, instrumentId);
    const effectiveTime = time + microDelaySec;

    // Étouffement (choke) strictement isolé par piste (trackId)
    deps.voiceGuard.chokeTrackVoice(trackId, requestedSymbol || stroke.symbol, effectiveTime);

    const rawBuffer = bufferEntry.get() as AudioBuffer;
    const isLeftHandRufada = (requestedSymbol || stroke.symbol) === 'r';
    const finalVelocity = isLeftHandRufada ? velocity * 0.88 : velocity;
    const pitchNuance = isLeftHandRufada ? 0.985 : 1.0;
    const microDetune = EngineTuning.calculateMicroDetuneMultiplier(instrumentId, trackId);
    const baseRate = stroke.isBarulho
      ? 1.0
      : EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning);
    const calculatedPitch = baseRate * pitchNuance * microDetune;

    const effectiveDecayNorm = computeEffectiveDecayNorm(decayMultiplier, track?.trackDecay, overrideTuning !== undefined);

    EngineStrokePlayback.play(
      deps.playbackCtx, trackId, instrumentId, stroke,
      rawBuffer, calculatedPitch, effectiveTime, finalVelocity, effectiveDecayNorm, isLiveHold
    );

    if (instrumentId === 'apito') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => {
        window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
      }, effectiveTime);
    }
  }
}
