import { channels, busChannels, busInputs, masterVolumeNode } from '../../audio/effects/effectsChainNodes';
import { computeBusLinearVcaGain, rampBusSendVcaFromFaderDrag, resolveImmediateBusId, syncBusSendVcaGain } from '../../audio/effects/postBusSendRouter';
import { getEffectiveMuteState, getEffectiveVolume, useSequencerStore } from '../../stores/useSequencerStore';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { faderPositionToGain } from '../../utils/audioMath';
import { applyChannelVolumeLinear, rampNativeLinearGain } from '../../utils/audio/channelFaderLinearRamp';
import type { Track, TrackGroup } from '../../types';

export function resolveTrackEffectiveFaderPos(
  track: TrackGroup | undefined,
  tracks: TrackGroup[],
  overrideOwnPos?: number
): number {
  const ownPos = overrideOwnPos !== undefined ? overrideOwnPos : (track?.volumeVal ?? 75);
  if (!track) return ownPos;

  const targetBusId = resolveImmediateBusId(track, tracks);
  const isConnectedToBusNode = Boolean(
    targetBusId !== null && (busInputs[targetBusId] || busChannels[targetBusId])
  );
  if (isConnectedToBusNode) return ownPos;

  if (overrideOwnPos !== undefined) {
    const patched = tracks.map((t) => (t.id === track.id ? { ...t, volumeVal: overrideOwnPos } : t));
    return getEffectiveVolume(patched, track.id);
  }
  return getEffectiveVolume(tracks, track.id);
}

export function applyRealtimeTrackOrBusFader(
  trackId: number | string,
  faderPos: number,
  durationSec = 0.018
): void {
  const tracks = useSequencerStore.getState().tracks;
  const track = tracks.find((t) => String(t.id) === String(trackId));
  const isBus = Boolean(track?.isBusFolder || track?.isLinkFolder);
  const channelNode = isBus
    ? (busChannels[trackId] || channels[trackId])
    : (channels[trackId] || busChannels[trackId]);

  const isMuted = getEffectiveMuteState(tracks, trackId);
  if (channelNode) {
    const effectivePos = resolveTrackEffectiveFaderPos(track, tracks, faderPos);
    const panCompDb = isBus ? 0 : applyMonoCompatiblePan(track?.panVal ?? track?.pan).panCompensationDb;
    applyChannelVolumeLinear(channelNode, effectivePos, panCompDb, isMuted, durationSec);
  }

  rampBusSendVcaFromFaderDrag(trackId, faderPos, durationSec);
}

export function applyRealtimeMasterFader(faderPos: number, durationSec = 0.018): void {
  if (masterVolumeNode?.gain) {
    rampNativeLinearGain(masterVolumeNode.gain, faderPositionToGain(faderPos), durationSec);
  }
}

export function openSoloPreviewChannelGain(ch: any, track: Track | undefined, tracks: Track[], isBus: boolean): void {
  if (!ch) return;
  const rawPos = track ? resolveTrackEffectiveFaderPos(track as any, tracks as any) : 75;
  const audiblePos = rawPos <= 3 ? 75 : rawPos;
  const panCompDb = isBus ? 0 : applyMonoCompatiblePan(track?.panVal ?? track?.pan).panCompensationDb;
  applyChannelVolumeLinear(ch, audiblePos, panCompDb, false, 0.015);
}

export function restoreStoreChannelGains(
  tracks: Track[],
  chMap: Record<string | number, any>,
  busMap: Record<string | number, any>
): void {
  tracks.forEach((t) => {
    const isBus = Boolean(t.isBusFolder || t.isLinkFolder);
    const ch = isBus ? busMap[t.id] : chMap[t.id];
    const muted = getEffectiveMuteState(tracks as any, t.id);
    const panComp = isBus ? 0 : applyMonoCompatiblePan(t.panVal ?? t.pan).panCompensationDb;
    applyChannelVolumeLinear(ch, resolveTrackEffectiveFaderPos(t as any, tracks as any), panComp, muted, 0.015);
    if (isBus || t.isLinkMaster) syncBusSendVcaGain(t.id, muted ? 0 : computeBusLinearVcaGain(t, tracks), 0.015);
  });
}
