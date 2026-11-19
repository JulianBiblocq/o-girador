/**
 * O Girador - Audio Engine High-Level Note & Preview Player (< 130 lignes)
 * - Garantie pré-écoute hors-morceau (`playPreview`) et réveil immédiat (`playNote`) depuis Écran 1 ou Écran 2.
 */
import { getTone } from '../../ToneLoader';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { wakeAudioContextForNotePreview } from '../audioContextSuspendManager';
import { EngineVirtualStrokes } from './engineVirtualStrokes';
import { NotePlayerDeps } from './enginePlayerTypes';
import { EngineExecuteStroke } from './engineExecuteStroke';
import { ensureAudiblePreview } from './enginePreviewMuteGuard';

export type { NotePlayerDeps };

export class EngineNotePlayer {
  public static buildDeps(
    audioContext: AudioContext, channels: any, voiceGuard: any, barulho: any,
    scheduledHits: any, activeGainNodes: any, sampleLoader: any, roundRobin: any,
    configMap: any, strokesMaps: any, trackLookupMap: any,
    getSchedulingMeasure: () => number
  ): NotePlayerDeps {
    return {
      playbackCtx: { audioContext, channels, voiceGuard, barulho, scheduledHits, activeGainNodes },
      sampleLoader, roundRobin, voiceGuard, configMap, strokesMaps, trackLookupMap,
      getSchedulingMeasure,
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
    const ctx = deps.playbackCtx.audioContext;
    const wasSuspended = wakeAudioContextForNotePreview(ctx);
    const currentTime = ctx.currentTime;
    if (!wasSuspended && time < currentTime - 0.120) return;
    const safeTime = Math.max(currentTime + (wasSuspended ? 0.008 : 0), time);

    let trackId: number | null = null;
    let instrumentId = '';
    const track = deps.trackLookupMap.get(String(trackIdOrInstrumentId));
    if (track) {
      trackId = track.id;
      instrumentId = instrumentsConfig[track.instrumentIdx].id;
    } else {
      instrumentId = String(trackIdOrInstrumentId);
    }

    const config = deps.configMap.get(instrumentId);
    if (!config) return;

    if (strokeSymbol === '/' || strokeSymbol === '.') {
      deps.playbackCtx.barulho.fadeOutBarulho(instrumentId, safeTime, strokeSymbol === '/' ? 0.450 : 0.035);
      return;
    }

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
    const ctx = deps.playbackCtx.audioContext;
    const wasSuspended = wakeAudioContextForNotePreview(ctx);

    const config = deps.configMap.get(instrumentId);
    if (strokeSymbol === '/' || strokeSymbol === '.') {
      const tNow = time !== undefined ? time : (Tone?.now() || ctx.currentTime);
      deps.playbackCtx.barulho.fadeOutBarulho(instrumentId, tNow, strokeSymbol === '/' ? 0.450 : 0.035);
      return;
    }
    const stroke = config ? EngineVirtualStrokes.resolveStroke(deps.strokesMaps, instrumentId, strokeSymbol) : null;
    if (!config || !stroke) return;

    const track = trackId !== null
      ? (deps.trackLookupMap.get(String(trackId)) || useSequencerStore.getState().tracks.find((t) => String(t.id) === String(trackId)) || null)
      : null;
    const resolvedTrackId = track ? track.id : (trackId !== null ? Number(trackId) : null);
    if (resolvedTrackId !== null) ensureAudiblePreview(resolvedTrackId);

    const nowRef = (Tone?.now() || ctx.currentTime) + (wasSuspended ? 0.008 : 0);
    const isStrokeReady = deps.sampleLoader.isStrokeLoaded(deps.configMap, instrumentId, strokeSymbol);

    if (isStrokeReady) {
      const triggerTime = time !== undefined ? Math.max(nowRef, time) : nowRef;
      EngineExecuteStroke.execute(
        deps, resolvedTrackId, instrumentId, config, stroke, triggerTime, velocity, decayMultiplier, pitchSemitones, false, track, strokeSymbol
      );
      void deps.sampleLoader.loadInstrumentSamples(ctx, deps.configMap, instrumentId).catch(() => {});
      return;
    }

    const relativeOffsetSec = time !== undefined ? Math.max(0, time - nowRef) : 0;
    deps.sampleLoader
      .loadStrokeSamples(ctx, deps.configMap, instrumentId, strokeSymbol)
      .then(() => {
        const afterLoadTime = (Tone?.now() || ctx.currentTime) + relativeOffsetSec;
        EngineExecuteStroke.execute(
          deps, resolvedTrackId, instrumentId, config, stroke, afterLoadTime, velocity, decayMultiplier, pitchSemitones, false, track, strokeSymbol
        );
        void deps.sampleLoader.loadInstrumentSamples(ctx, deps.configMap, instrumentId).catch(() => {});
      })
      .catch(console.error);
  }
}
