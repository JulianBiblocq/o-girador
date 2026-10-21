/**
 * O Girador - Audio Engine High-Level Note & Preview Player
 */

import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { EngineVirtualStrokes } from './engineVirtualStrokes';
import { EngineRoundRobin } from './engineRoundRobin';
import { EngineVoiceGuard } from './engineVoiceGuard';
import { EngineSampleLoader } from './engineSampleLoader';
import { PlaybackContext } from './engineStrokePlayback';
import { NotePlayerDeps } from './enginePlayerTypes';
import { EngineExecuteStroke } from './engineExecuteStroke';

export type { NotePlayerDeps };

export class EngineNotePlayer {
  public static buildDeps(
    audioContext: AudioContext, channels: any, voiceGuard: any, barulho: any,
    scheduledHits: any, activeGainNodes: any, sampleLoader: any, roundRobin: any,
    configMap: any, strokesMaps: any, trackLookupMap: any, timeSlotHitCounts: any,
    getSchedulingMeasure: () => number
  ): NotePlayerDeps {
    return {
      playbackCtx: { audioContext, channels, voiceGuard, barulho, scheduledHits, activeGainNodes },
      sampleLoader, roundRobin, voiceGuard, configMap, strokesMaps, trackLookupMap,
      timeSlotHitCounts, getSchedulingMeasure
    };
  }
  public static playNote(
    deps: NotePlayerDeps,
    trackIdOrInstrumentId: number | string,
    strokeSymbol: string,
    time: number,
    velocity: number,
    decayMultiplier: number,
    isLiveHold: boolean = false
  ): void {
    if (time < deps.playbackCtx.audioContext.currentTime - 0.050) return;

    let trackId: number | null = null;
    let instrumentId = '';
    const track = deps.trackLookupMap.get(String(trackIdOrInstrumentId));
    if (track) {
      trackId = track.id;
      instrumentId = instrumentsConfig[track.instrumentIdx].id;
    } else {
      instrumentId = String(trackIdOrInstrumentId);
    }

    const timeSlot = Math.round(time * 333);
    if (deps.timeSlotHitCounts.size > 2000) deps.timeSlotHitCounts.clear();
    const currentHits = (deps.timeSlotHitCounts.get(timeSlot) || 0) + 1;
    deps.timeSlotHitCounts.set(timeSlot, currentHits);

    const isSlave = Boolean(track && track.linkedToTrackId && !track.isLinkMaster);
    if (isSlave) {
      const hasLocalVariation = Boolean(
        track?.patternOverrides && track.patternOverrides[deps.getSchedulingMeasure()] !== undefined
      );
      // Ne plus couper les pistes esclaves sur mobile : laisser sonner tous les doublages de pupitres
      if (!hasLocalVariation && currentHits > 24) return;
    }

    const config = deps.configMap.get(instrumentId);
    if (!config) return;

    const stroke = EngineVirtualStrokes.resolveStroke(deps.strokesMaps, instrumentId, strokeSymbol);
    if (!stroke) return;

    EngineExecuteStroke.execute(
      deps, trackId, instrumentId, config, stroke, time, velocity, decayMultiplier, undefined, isLiveHold, track || null
    );
  }

  public static playPreview(
    deps: NotePlayerDeps,
    instrumentId: string,
    strokeSymbol: string,
    pitchSemitones: number = 0,
    velocity: number = 1.0,
    time?: number
  ): void {
    const Tone = getTone();
    if (deps.playbackCtx.audioContext?.state !== 'running') deps.playbackCtx.audioContext.resume().catch(() => {});
    if (Tone?.context?.state !== 'running') {
      if (typeof (Tone?.context as any)?.resume === 'function') (Tone.context as any).resume().catch(() => {});
      Tone?.start?.().catch(() => {});
    }
    if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();

    deps.sampleLoader.loadInstrumentSamples(deps.playbackCtx.audioContext, deps.configMap, instrumentId).catch(console.error);
    const config = deps.configMap.get(instrumentId);
    const stroke = config ? EngineVirtualStrokes.resolveStroke(deps.strokesMaps, instrumentId, strokeSymbol) : null;
    if (!config || !stroke) return;

    const triggerTime = time !== undefined ? time : (Tone?.now() || deps.playbackCtx.audioContext.currentTime);
    EngineExecuteStroke.execute(
      deps, null, instrumentId, config, stroke, triggerTime, velocity, 1.0, pitchSemitones, false, null
    );
  }
}
