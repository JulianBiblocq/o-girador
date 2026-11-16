/**
 * O Girador - Audio Engine High-Level Note & Preview Player (< 130 lignes)
 * - Garantie pré-écoute hors-morceau (`playPreview`) : si un instrument absent de `state.tracks` n'est pas encore
 *   en RAM (Wizard ou filtre « Tous les instruments »), charge le coup à la demande puis déclenche la frappe immédiatement.
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
    if (ctx?.state !== 'running') ctx?.resume?.().catch(() => {});
    if (Tone?.context?.state !== 'running') {
      if (typeof (Tone?.context as any)?.resume === 'function') (Tone.context as any).resume().catch(() => {});
      Tone?.start?.().catch(() => {});
    }
    if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();

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

    const nowRef = Tone?.now() || ctx.currentTime;
    const isStrokeReady = deps.sampleLoader.isStrokeLoaded(deps.configMap, instrumentId, strokeSymbol);

    if (isStrokeReady) {
      const triggerTime = time !== undefined ? time : nowRef;
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
