import * as Tone from 'tone';
import { Track } from '../../types';
import { isToadaBus } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { AudioEngine } from '../../AudioEngine';

export interface SoloTransportContext {
  tracksRef: { current: Track[] };
  savedSoloMuteStateRef: { current: any };
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
  lastAppliedTracksParamsRef: { current: Record<string | number, string> };
  soloLoopCycleRef: { current: number };
  currentStepIndexRef: { current: number };
  measureCountRef: { current: number };
  isPlaybackEndingRef: { current: boolean };
  lastPlayedSignalIdRef: { current: string | null };
  isPlayingRef: { current: boolean };
  audioEngine: AudioEngine | null;
  setSoloPatternPlayId: (id: number | null) => void;
  setSoloPatternVariationId: (id: string | null) => void;
  setCurrentMeasure: (m: number) => void;
  setIsPlaying: (p: boolean) => void;
  setIsLoading: (l: boolean) => void;
  handleStop: () => void;
}

export async function handleStartSoloPattern(patternId: number, variationId: string | undefined, ctx: SoloTransportContext): Promise<void> {
  if (!useAudioStore.getState().isAudioUnlocked) {
    useAudioStore.getState().unlockAudio();
  }

  if (Tone.context && Tone.context.state !== 'running') {
    try { await Tone.context.resume(); } catch (_) {}
  }
  if (Tone.start) {
    try { await Tone.start(); } catch (_) {}
  }

  ctx.audioEngine?.stop();
  Tone.Transport.stop();
  ctx.audioEngine?.stopAllBarulho();
  stopAllNativeOscillators();
  vocalEngineService.stopAllVocalPlayback();

  const currentTracks = ctx.tracksRef.current;
  const soloTrack = currentTracks.find(t => t.patterns && t.patterns.some(p => String(p.id) === String(patternId)));
  const toadaTrack = currentTracks.find(t => isToadaBus(t));
  const toadaId = toadaTrack ? toadaTrack.id : null;
  const trackId = soloTrack ? soloTrack.id : null;

  if (trackId !== null) {
    ctx.savedSoloMuteStateRef.current = {
      trackId,
      trackMuted: ctx.channels[trackId]?.mute,
      trackVol: ctx.channels[trackId]?.volume.value,
      toadaId: toadaId ?? undefined,
      toadaMuted: toadaId ? ctx.busChannels[toadaId]?.mute : undefined,
      toadaVol: toadaId ? ctx.busChannels[toadaId]?.volume.value : undefined,
    };

    if (ctx.channels[trackId]) {
      ctx.channels[trackId].mute = false;
      if (ctx.channels[trackId].volume.value < -60) ctx.channels[trackId].volume.value = 0;
    }
    if (toadaId && ctx.busChannels[toadaId]) {
      ctx.busChannels[toadaId].mute = false;
      if (ctx.busChannels[toadaId].volume.value < -60) ctx.busChannels[toadaId].volume.value = 0;
    }
  }

  ctx.setSoloPatternPlayId(patternId);
  ctx.setSoloPatternVariationId(variationId || null);
  ctx.soloLoopCycleRef.current = 0;
  ctx.currentStepIndexRef.current = -1;
  ctx.measureCountRef.current = 0;
  ctx.isPlaybackEndingRef.current = false;
  ctx.setCurrentMeasure(0);
  Tone.Transport.seconds = 0;
  ctx.lastPlayedSignalIdRef.current = null;

  ctx.setIsLoading(true);
  try {
    if (Tone.loaded) await Tone.loaded();
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (_) {
  } finally {
    ctx.setIsLoading(false);
  }

  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }
  ctx.audioEngine?.start();
  ctx.setIsPlaying(true);
  ctx.isPlayingRef.current = true;
}

export function handleStopSoloPattern(ctx: SoloTransportContext): void {
  if (ctx.savedSoloMuteStateRef.current) {
    const { trackId, trackMuted, trackVol, toadaId, toadaMuted, toadaVol } = ctx.savedSoloMuteStateRef.current;
    if (trackId !== undefined && ctx.channels[trackId]) {
      if (trackMuted !== undefined) ctx.channels[trackId].mute = trackMuted;
      if (trackVol !== undefined) ctx.channels[trackId].volume.value = trackVol;
    }
    if (toadaId !== undefined && ctx.busChannels[toadaId]) {
      if (toadaMuted !== undefined) ctx.busChannels[toadaId].mute = toadaMuted;
      if (toadaVol !== undefined) ctx.busChannels[toadaId].volume.value = toadaVol;
    }
    ctx.savedSoloMuteStateRef.current = null;
  }
  ctx.lastAppliedTracksParamsRef.current = {};
  ctx.setSoloPatternPlayId(null);
  ctx.setSoloPatternVariationId(null);
  ctx.soloLoopCycleRef.current = 0;
  if (ctx.isPlayingRef.current) {
    ctx.handleStop();
  }
}
