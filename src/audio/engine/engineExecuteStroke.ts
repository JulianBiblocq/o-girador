/**
 * O Girador - Audio Engine Low-Level Stroke Execution (< 115 lignes)
 * - Lecture phase-continue 100 % naturelle des tambours (`playbackRate = 2^(st/12)`).
 * - Fallback intelligent `A -> pool e (80 ms)` si un sample `A` n'est pas chargé.
 * - Physique de peau isolée par piste (`trackId` ou `instrumentId` en preview clavier).
 */

import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { ALFAIA_INSTRUMENTS } from './engineTypes';
import { EngineTuning } from './engineTuning';
import { EngineStrokePlayback } from './engineStrokePlayback';
import { resolveTrackSectionTemperament } from '../groove/sectionTemperament';
import type { NotePlayerDeps } from './enginePlayerTypes';

export function computeEffectiveDecayNorm(
  rawStepDecay: number | undefined,
  rawTrackDecay: number | undefined,
  isPreviewOverride = false
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
    const effectiveSymbol = requestedSymbol || stroke.symbol;

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

    let resolvedStroke = stroke;
    let forceShort80ms = false;
    let filePath = deps.roundRobin.selectFile(instrumentId, resolvedStroke, time, trackId);
    let bufferEntry = deps.sampleLoader.bufferPool.get(filePath);

    if ((!bufferEntry || !bufferEntry.loaded) && ALFAIA_INSTRUMENTS.has(instrumentId) && (effectiveSymbol === 'A' || effectiveSymbol === 'a')) {
      const fallbackE = config.strokes.find((s) => s.symbol === 'e');
      if (fallbackE) {
        resolvedStroke = fallbackE;
        forceShort80ms = true;
        filePath = deps.roundRobin.selectFile(instrumentId, resolvedStroke, time, trackId);
        bufferEntry = deps.sampleLoader.bufferPool.get(filePath);
      }
    }
    if (!bufferEntry || !bufferEntry.loaded) return;

    const allTracks = deps.trackLookupMap.size > 0 ? Array.from(deps.trackLookupMap.values()) : undefined;
    const microDelaySec = overrideTuning !== undefined ? 0 : resolveTrackSectionTemperament(track, allTracks).attackSpreadSec;
    const effectiveTime = time + microDelaySec;
    const voiceGuardKey = trackId !== null ? trackId : instrumentId;

    deps.voiceGuard.chokeTrackVoice(voiceGuardKey, effectiveSymbol, effectiveTime, instrumentId);

    const rawBuffer = bufferEntry.get() as AudioBuffer;
    const isLeftHandRufada = effectiveSymbol === 'r';
    const finalVelocity = isLeftHandRufada ? velocity * 0.88 : velocity;
    const pitchNuance = isLeftHandRufada ? 0.985 : 1.0;
    const baseRate = resolvedStroke.isBarulho
      ? 1.0
      : EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning);
    const calculatedPitch = baseRate * pitchNuance;
    const effectiveDecayNorm = computeEffectiveDecayNorm(decayMultiplier, track?.trackDecay, overrideTuning !== undefined);

    EngineStrokePlayback.play(
      deps.playbackCtx, trackId, instrumentId, resolvedStroke,
      rawBuffer, calculatedPitch, effectiveTime, finalVelocity, effectiveDecayNorm, isLiveHold,
      { isStudioCalibrated: Boolean(config.calibratedStudioBank), forceShort80ms, strokeSymbol: effectiveSymbol }
    );

    if (instrumentId === 'apito') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => {
        window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
      }, effectiveTime);
    }
  }
}
