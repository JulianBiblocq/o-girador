import * as Tone from 'tone';
import { Track } from '../../types';
import { isToadaBus } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';
import { buildFlatSongSchedule } from '../../workers/compiler/flatScheduleBuilder';
import { instrumentsConfig } from '../../data';
import { cancelAudioContextAutoSuspend, safeResumeAudioContext } from '../../audio/audioContextSuspendManager';

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
  soloPatternPlayIdRef?: { current: number | null };
  soloPatternVariationIdRef?: { current: string | null };
  flatCompiledScheduleRef?: { current: Float64Array | null };
  totalMeasuresRef?: { current: number };
  measureTimeSigsRef?: { current: Record<number, string> };
}

const unmuteChannel = (ch?: Tone.Channel) => {
  if (ch) { ch.mute = false; if (ch.volume.value < -60) ch.volume.value = 0; }
};

export async function handleStartSoloPattern(patternId: number, variationId: string | undefined, ctx: SoloTransportContext): Promise<void> {
  if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();
  cancelAudioContextAutoSuspend();
  await safeResumeAudioContext();
  if (Tone.start) { try { await Tone.start(); } catch (_) {} }

  ctx.audioEngine?.stop(); Tone.Transport.stop(); ctx.audioEngine?.stopAllBarulho();
  stopAllNativeOscillators(); vocalEngineService.stopAllVocalPlayback();

  const currentTracks = ctx.tracksRef.current;
  const soloTrack = currentTracks.find(t => t.patterns && t.patterns.some(p => String(p.id) === String(patternId)));
  const soloPattern = soloTrack?.patterns?.find(p => String(p.id) === String(patternId));
  const firstAssignedMeasure = soloPattern?.measureAssignments?.findIndex((a: boolean) => a === true) ?? -1;
  const targetMeasure = firstAssignedMeasure >= 0 ? firstAssignedMeasure : 0;
  const toadaTrack = currentTracks.find(t => isToadaBus(t));
  const toadaId = toadaTrack ? toadaTrack.id : null;
  const trackId = soloTrack ? soloTrack.id : null;

  if (trackId !== null && soloTrack) {
    const busId = (soloTrack.isBusFolder || soloTrack.isLinkFolder) ? soloTrack.id : (soloTrack.busId || soloTrack.linkedToTrackId);
    const familyGroupKey = (soloTrack.isBusFolder || soloTrack.isLinkFolder) ? String(soloTrack.id) : String(soloTrack.linkedToTrackId || soloTrack.id);
    const familyTracks = currentTracks.filter(s =>
      s.id !== soloTrack.id && !s.isBusFolder && !s.isLinkFolder &&
      (String(s.linkedToTrackId) === familyGroupKey || String(s.busId) === familyGroupKey)
    );
    const targetChannelIds = soloTrack.isBusFolder ? familyTracks.map(s => s.id) : [soloTrack.id, ...familyTracks.map(s => s.id)];

    ctx.savedSoloMuteStateRef.current = {
      channelStates: targetChannelIds.map(id => ({ id, mute: ctx.channels[id]?.mute, vol: ctx.channels[id]?.volume.value })),
      busId: busId ?? undefined, busMuted: busId ? ctx.busChannels[busId]?.mute : undefined,
      toadaId: toadaId ?? undefined, toadaMuted: toadaId ? ctx.busChannels[toadaId]?.mute : undefined,
    };

    targetChannelIds.forEach(id => unmuteChannel(ctx.channels[id]));
    if (busId) unmuteChannel(ctx.busChannels[busId]);
    if (toadaId) unmuteChannel(ctx.busChannels[toadaId]);
  }

  if (ctx.soloPatternPlayIdRef) ctx.soloPatternPlayIdRef.current = patternId;
  if (ctx.soloPatternVariationIdRef) ctx.soloPatternVariationIdRef.current = variationId || 'ensemble';
  ctx.setSoloPatternPlayId(patternId); ctx.setSoloPatternVariationId(variationId || null);
  ctx.soloLoopCycleRef.current = 0; ctx.currentStepIndexRef.current = -1;
  ctx.measureCountRef.current = targetMeasure; ctx.isPlaybackEndingRef.current = false;
  ctx.setCurrentMeasure(targetMeasure); Tone.Transport.seconds = 0; ctx.lastPlayedSignalIdRef.current = null;

  const activeEngine = ctx.audioEngine || getAudioEngine();
  if (activeEngine) {
    activeEngine.currentMeasure = targetMeasure; activeEngine.currentStep = 0;
    activeEngine.schedulingMeasure = targetMeasure; activeEngine.schedulingStep = 0;
  }

  if (ctx.flatCompiledScheduleRef) {
    const rawSigs = ctx.measureTimeSigsRef?.current;
    const timeSigs: string[] = Array.isArray(rawSigs) ? rawSigs : Array.from({ length: ctx.totalMeasuresRef?.current || 1 }, (_, i) => rawSigs?.[i] || '4/4');
    ctx.flatCompiledScheduleRef.current = buildFlatSongSchedule(
      currentTracks, ctx.totalMeasuresRef?.current || 1, timeSigs,
      instrumentsConfig, patternId, variationId || 'ensemble', false
    ) as any;
  }

  ctx.setIsLoading(true);
  try {
    if (Tone.loaded) await Tone.loaded();
    await new Promise(resolve => setTimeout(resolve, 80));
  } catch (_) {
  } finally {
    ctx.setIsLoading(false);
  }

  cancelAudioContextAutoSuspend();
  await safeResumeAudioContext();
  if (Tone.Transport.state !== 'started') Tone.Transport.start();
  activeEngine?.start();
  ctx.setIsPlaying(true); ctx.isPlayingRef.current = true;
}

export function handleStopSoloPattern(ctx: SoloTransportContext): void {
  if (ctx.savedSoloMuteStateRef.current) {
    const { channelStates, busId, busMuted, toadaId, toadaMuted } = ctx.savedSoloMuteStateRef.current;
    channelStates?.forEach(({ id, mute, vol }: any) => {
      const ch = ctx.channels[id];
      if (ch) { if (mute !== undefined) ch.mute = mute; if (vol !== undefined) ch.volume.value = vol; }
    });
    if (busId !== undefined && ctx.busChannels[busId] && busMuted !== undefined) ctx.busChannels[busId].mute = busMuted;
    if (toadaId !== undefined && ctx.busChannels[toadaId] && toadaMuted !== undefined) ctx.busChannels[toadaId].mute = toadaMuted;
    ctx.savedSoloMuteStateRef.current = null;
  }
  ctx.lastAppliedTracksParamsRef.current = {};
  ctx.setSoloPatternPlayId(null); ctx.setSoloPatternVariationId(null);
  if (ctx.soloPatternPlayIdRef) ctx.soloPatternPlayIdRef.current = null;
  if (ctx.soloPatternVariationIdRef) ctx.soloPatternVariationIdRef.current = null;
  ctx.soloLoopCycleRef.current = 0;
  if (ctx.isPlayingRef.current) ctx.handleStop();
}
