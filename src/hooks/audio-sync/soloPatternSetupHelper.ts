import * as Tone from 'tone';
import { AudioEngine } from '../../AudioEngine';
import { syncBusSendVcaGain } from '../../audio/effectsChain';
import { getCurrentWorkletMeasureSeqId, rebuildWorkletHorizonFromNow } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { instrumentsConfig } from '../../data';
import { getTrackFamilyIds, isToadaBus } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { Track } from '../../types';
import { faderPositionToGain } from '../../utils/audioMath';
import { buildFlatSongSchedule } from '../../workers/compiler/flatScheduleBuilder';
import { getMeasureStartTick } from './audioParamsCache';
import { advanceLiveVariationLookahead, invalidateFutureVariationSnapshots } from './liveVariationLookaheadEngine';
import { openSoloPreviewChannelGain } from './realtimeFaderAudioUpdater';

export function openSoloFamilyAndBusGains(params: {
  soloTrack: Track | undefined;
  currentTracks: Track[];
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
  savedSoloMuteStateRef: { current: any };
}): void {
  const { soloTrack, currentTracks, channels, busChannels, savedSoloMuteStateRef } = params;
  if (!soloTrack) return;

  const familyIds = getTrackFamilyIds(soloTrack.id, currentTracks as any[]);
  const targetTracks = currentTracks.filter(
    (t) =>
      !t.isBusFolder &&
      !t.isLinkFolder &&
      (String(t.id) === String(soloTrack.id) || familyIds.includes(String(t.id)))
  );

  savedSoloMuteStateRef.current = { active: true };
  targetTracks.forEach((t) => openSoloPreviewChannelGain(channels[t.id], t, currentTracks, false));

  const busIds = new Set<string>();
  if (soloTrack.isBusFolder || soloTrack.isLinkFolder) busIds.add(String(soloTrack.id));
  if (soloTrack.busId) busIds.add(String(soloTrack.busId));
  if (soloTrack.linkedToTrackId) busIds.add(String(soloTrack.linkedToTrackId));
  targetTracks.forEach((t) => {
    if (t.busId) busIds.add(String(t.busId));
    if (t.linkedToTrackId) busIds.add(String(t.linkedToTrackId));
  });

  busIds.forEach((bId) => {
    const busTrack = currentTracks.find((t) => String(t.id) === bId);
    if (busChannels[bId]) {
      openSoloPreviewChannelGain(busChannels[bId], busTrack, currentTracks, true);
      const rawVol = busTrack?.volumeVal ?? 75;
      syncBusSendVcaGain(bId, faderPositionToGain(rawVol <= 3 ? 75 : rawVol), 0.015);
    }
  });

  const toadaTrack = currentTracks.find((t) => isToadaBus(t));
  if (toadaTrack && busChannels[toadaTrack.id]) {
    openSoloPreviewChannelGain(busChannels[toadaTrack.id], toadaTrack, currentTracks, true);
  }
}

export function tryHotSwapSoloPattern(params: {
  patternId: number;
  effectiveVarId: string;
  targetMeasure: number;
  totalMeasures: number;
  timeSigs: string[];
  soloTrack: Track | undefined;
  currentTracks: Track[];
  activeEngine: AudioEngine | null;
  ctx: {
    isPlayingRef: { current: boolean };
    soloPatternPlayIdRef?: { current: number | null };
    soloPatternVariationIdRef?: { current: string | null };
    measureCountRef: { current: number };
    channels: Record<string | number, Tone.Channel>;
    busChannels: Record<string | number, Tone.Channel>;
    savedSoloMuteStateRef: { current: any };
    flatCompiledScheduleRef?: { current: Float64Array | null };
    activeVariationsRef?: { current: Record<number, any> };
  };
}): boolean {
  const { patternId, effectiveVarId, targetMeasure, totalMeasures, timeSigs, soloTrack, currentTracks, activeEngine, ctx } = params;
  const canHotSwap = Boolean(
    ctx.isPlayingRef.current && ctx.soloPatternPlayIdRef?.current !== null &&
    (ctx.measureCountRef.current % Math.max(1, totalMeasures)) === targetMeasure
  );
  if (!canHotSwap) return false;
  openSoloFamilyAndBusGains({ soloTrack, currentTracks, channels: ctx.channels, busChannels: ctx.busChannels, savedSoloMuteStateRef: ctx.savedSoloMuteStateRef });
  if (ctx.soloPatternPlayIdRef) ctx.soloPatternPlayIdRef.current = patternId;
  if (ctx.soloPatternVariationIdRef) ctx.soloPatternVariationIdRef.current = effectiveVarId;
  useTransportStore.getState().setSoloPatternPlayback(patternId, effectiveVarId);
  if (ctx.flatCompiledScheduleRef) {
    ctx.flatCompiledScheduleRef.current = buildFlatSongSchedule(currentTracks, totalMeasures, timeSigs, instrumentsConfig, patternId, effectiveVarId, false) as any;
  }
  const curSeqId = getCurrentWorkletMeasureSeqId();
  if (curSeqId > 0 && activeEngine?.workletReady) {
    rebuildWorkletHorizonFromNow('solo');
  } else {
    const st = getMeasureStartTick(targetMeasure, timeSigs as any);
    invalidateFutureVariationSnapshots(0, true);
    advanceLiveVariationLookahead({
      currentMeasureIdx: targetMeasure, nextMeasureIdx: targetMeasure, currentMeasureStartTick: st, nextMeasureStartTick: st,
      tracks: currentTracks, measureTimeSigs: timeSigs, soloPatternPlayId: patternId, soloPatternVariationId: effectiveVarId,
      activeVariationsRef: ctx.activeVariationsRef, currentMeasureSeqId: curSeqId > 0 ? curSeqId : undefined,
    });
  }
  return true;
}

export function primeSoloVariationLookahead(params: {
  targetMeasure: number;
  totalMeasures: number;
  currentTracks: Track[];
  measureTimeSigs: Record<number, string> | string[];
  patternId: number;
  effectiveVarId: string;
  activeVariationsRef?: { current: Record<number, any> };
}): void {
  const { targetMeasure, currentTracks, measureTimeSigs, patternId, effectiveVarId, activeVariationsRef } = params;
  const startTick = getMeasureStartTick(targetMeasure, measureTimeSigs as Record<number, string>);
  advanceLiveVariationLookahead({
    currentMeasureIdx: targetMeasure,
    nextMeasureIdx: targetMeasure,
    currentMeasureStartTick: startTick,
    nextMeasureStartTick: startTick,
    tracks: currentTracks,
    measureTimeSigs,
    soloPatternPlayId: patternId,
    soloPatternVariationId: effectiveVarId,
    activeVariationsRef,
    currentMeasureSeqId: 1,
  });
}
