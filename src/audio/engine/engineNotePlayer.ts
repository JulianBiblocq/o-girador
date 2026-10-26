/**
 * O Girador - Audio Engine High-Level Note & Preview Player (< 120 lignes)
 */
import { getTone } from '../../ToneLoader';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { EngineVirtualStrokes } from './engineVirtualStrokes';
import { NotePlayerDeps } from './enginePlayerTypes';
import { EngineExecuteStroke } from './engineExecuteStroke';
import { ensureAudiblePreview } from './enginePreviewMuteGuard';

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
    isLiveHold = false
  ): void {
    const currentTime = deps.playbackCtx.audioContext.currentTime;
    if (time < currentTime - 0.120) return;
    const safeTime = Math.max(currentTime, time);

    let trackId: number | null = null;
    let instrumentId = '';
    const track = deps.trackLookupMap.get(String(trackIdOrInstrumentId));
    if (track) {
      trackId = track.id;
      instrumentId = instrumentsConfig[track.instrumentIdx].id;
    } else {
      instrumentId = String(trackIdOrInstrumentId);
    }

    const timeSlot = Math.round(safeTime * 333);
    if (deps.timeSlotHitCounts.size > 2000) deps.timeSlotHitCounts.clear();
    const currentHits = (deps.timeSlotHitCounts.get(timeSlot) || 0) + 1;
    deps.timeSlotHitCounts.set(timeSlot, currentHits);

    const config = deps.configMap.get(instrumentId);
    if (!config) return;

    const stroke = EngineVirtualStrokes.resolveStroke(deps.strokesMaps, instrumentId, strokeSymbol);
    if (!stroke) return;

    if (trackId !== null) ensureAudiblePreview(trackId);

    EngineExecuteStroke.execute(
      deps, trackId, instrumentId, config, stroke, safeTime, velocity, decayMultiplier, undefined, isLiveHold, track || null, strokeSymbol
    );
  }

  public static playPreview(
    deps: NotePlayerDeps,
    instrumentId: string,
    strokeSymbol: string,
    pitchSemitones = 0,
    velocity = 1.0,
    time?: number,
    decayMultiplier = 1.0,
    trackId: number | string | null = null
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

    const track = trackId !== null
      ? (deps.trackLookupMap.get(String(trackId)) || useSequencerStore.getState().tracks.find((t) => String(t.id) === String(trackId)) || null)
      : null;
    const resolvedTrackId = track ? track.id : (trackId !== null ? Number(trackId) : null);

    if (resolvedTrackId !== null) ensureAudiblePreview(resolvedTrackId);

    const triggerTime = time !== undefined ? time : (Tone?.now() || deps.playbackCtx.audioContext.currentTime);
    EngineExecuteStroke.execute(
      deps, resolvedTrackId, instrumentId, config, stroke, triggerTime, velocity, decayMultiplier, pitchSemitones, false, track, strokeSymbol
    );
  }
}
