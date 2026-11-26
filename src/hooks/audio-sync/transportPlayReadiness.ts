/**
 * transportPlayReadiness.ts — Attente sécurisée des pistes, buffers actifs (Passe 1), AudioWorklet et grille compilée
 * avant le démarrage de l'horloge du séquenceur, avec affichage propre de `isLoading` (< 110 lignes).
 */
import * as Tone from 'tone';
import { AudioEngine } from '../../AudioEngine';
import { safeResumeAudioContext } from '../../audio/audioContextSuspendManager';
import { extractActiveInstrumentsFromTracks } from '../../audio/engine/activeTrackPreloadExtractor';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Track } from '../../types';
import { buildFlatSongSchedule } from '../../workers/compiler/flatScheduleBuilder';
import {
  busChannels, busMeters, channels, distortionSends, masterVolumeNode, meters, reverbSends, trackInputs,
} from './audioEngineNodes';
import { syncBusChannels } from './syncBusChannels';
import { syncTrackChannels } from './syncTrackChannels';

export interface TransportReadinessDeps {
  tracksRef: { current: Track[] };
  totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  soloPatternPlayIdRef: { current: number | null };
  soloPatternVariationIdRef?: { current: string | null };
  flatCompiledScheduleRef?: { current: Float64Array | null };
  lastAppliedTracksParamsRef?: { current: Record<string | number, string> };
  lastAppliedBussesRef?: { current: Record<string | number, string | number | null> };
  setIsLoading?: (loading: boolean) => void;
}

export async function ensureTransportPlayReady(
  activeEngine: AudioEngine | null,
  deps: TransportReadinessDeps
): Promise<Track[]> {
  deps.setIsLoading?.(true);
  try {
    await safeResumeAudioContext();

    let startTracks = deps.tracksRef.current;
    if (!startTracks || startTracks.length === 0) {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const storeTracks = useSequencerStore.getState().tracks;
        if (storeTracks && storeTracks.length > 0) {
          deps.tracksRef.current = storeTracks;
          startTracks = storeTracks;
          break;
        }
        if (deps.tracksRef.current && deps.tracksRef.current.length > 0) {
          startTracks = deps.tracksRef.current;
          break;
        }
        await new Promise((r) => setTimeout(r, 40));
      }
    }

    if (startTracks && startTracks.length > 0) {
      const needsChannelWiring = startTracks.some(
        (t) => t && !t.isBusFolder && !t.isLinkFolder && (!channels[t.id] || !trackInputs[t.id])
      );
      if (needsChannelWiring && deps.lastAppliedTracksParamsRef && deps.lastAppliedBussesRef) {
        const isEcoMode = Boolean(useSequencerStore.getState().isEcoMode);
        syncBusChannels({
          tracks: startTracks, isEcoMode, busChannels, busMeters, reverbSends, distortionSends,
          lastAppliedTracksParamsRef: deps.lastAppliedTracksParamsRef,
          lastAppliedBussesRef: deps.lastAppliedBussesRef, masterVolumeNode,
        });
        syncTrackChannels({
          tracks: startTracks, isEcoMode, channels, meters, trackInputs, busChannels, reverbSends, distortionSends,
          lastAppliedTracksParamsRef: deps.lastAppliedTracksParamsRef,
          lastAppliedBussesRef: deps.lastAppliedBussesRef, masterVolumeNode, audioEngine: activeEngine,
        });
      }
    }

    if (activeEngine) {
      try {
        await activeEngine.syncActiveInstrumentsMemory(extractActiveInstrumentsFromTracks(startTracks));
      } catch (_) {}
      await activeEngine.waitForWorkletReady();
      activeEngine.syncTracksToWorklet(startTracks);
    }

    if (
      deps.flatCompiledScheduleRef &&
      (!deps.flatCompiledScheduleRef.current || deps.flatCompiledScheduleRef.current.length === 0) &&
      startTracks && startTracks.length > 0
    ) {
      const totalM = deps.totalMeasuresRef.current || useSequencerStore.getState().totalMeasures || 1;
      const rawSigs = deps.measureTimeSigsRef.current;
      const timeSigs = Array.from({ length: totalM }, (_, i) => rawSigs?.[i] || '4/4');
      const soloId = deps.soloPatternPlayIdRef.current;
      const soloVar = deps.soloPatternVariationIdRef?.current ?? null;
      const isolateBase = soloId !== null ? false : Boolean(useSequencerStore.getState().isolateBaseOnly);
      deps.flatCompiledScheduleRef.current = buildFlatSongSchedule(
        startTracks, totalM, timeSigs, instrumentsConfig, soloId, soloVar, isolateBase
      ) as any;
    }

    if (vocalEngineService.getRehydratingPromise() || vocalEngineService.needsRehydration(startTracks)) {
      try { await vocalEngineService.rehydrateVocalBuffers(startTracks); } catch (_) {}
    }

    if (activeEngine && String((activeEngine.getAudioContext?.() as any)?.state) !== 'running') {
      await safeResumeAudioContext();
    }
    if (Tone.context && String((Tone.context as any).state) !== 'running') {
      await safeResumeAudioContext();
    }
    return startTracks;
  } finally {
    deps.setIsLoading?.(false);
  }
}
