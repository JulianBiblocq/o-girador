import * as Tone from 'tone';
import { Track } from '../../types';
import { getTrackFamilyIds, isToadaBus } from '../../stores/useSequencerStore';
import { syncBusSendVcaGain } from '../../audio/effectsChain';
import { faderPositionToGain } from '../../utils/audioMath';
import { getMeasureStartTick } from './audioParamsCache';
import { advanceLiveVariationLookahead } from './liveVariationLookaheadEngine';
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

export function primeSoloVariationLookahead(params: {
  targetMeasure: number;
  totalMeasures: number;
  currentTracks: Track[];
  measureTimeSigs: Record<number, string> | string[];
  patternId: number;
  effectiveVarId: string;
  activeVariationsRef?: { current: Record<number, any> };
}): void {
  const { targetMeasure, totalMeasures, currentTracks, measureTimeSigs, patternId, effectiveVarId, activeVariationsRef } = params;
  const totalM = Math.max(1, totalMeasures || 1);
  const nextM = (targetMeasure + 1) % totalM;
  const startTick = getMeasureStartTick(targetMeasure, measureTimeSigs as Record<number, string>);
  advanceLiveVariationLookahead({
    currentMeasureIdx: targetMeasure,
    nextMeasureIdx: nextM,
    currentMeasureStartTick: startTick,
    tracks: currentTracks,
    measureTimeSigs,
    soloPatternPlayId: patternId,
    soloPatternVariationId: effectiveVarId,
    activeVariationsRef,
  });
}
