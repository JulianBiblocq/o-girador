/**
 * O Girador - Audibility Guard for Previews and Audition Taps (< 65 lines)
 * Zero mutation de Tone.Channel.mute : utilise exclusivement des rampes lineaires en gain.
 */
import { channels, busChannels, resolveImmediateBusId } from '../effectsChain';
import { useSequencerStore, getEffectiveMuteState } from '../../stores/useSequencerStore';
import { applyChannelVolumeLinear } from '../../utils/audio/channelFaderLinearRamp';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { resolveTrackEffectiveFaderPos } from '../../hooks/audio-sync/realtimeFaderAudioUpdater';

const restoreTimeouts = new Map<number | string, any>();

export function ensureAudiblePreview(trackId: number | string | null): void {
  if (trackId === null || trackId === undefined) return;
  const numTrackId = Number(trackId);
  if (!Number.isFinite(numTrackId)) return;

  const state = useSequencerStore.getState();
  if (state.isPlaying) return;

  const channelNode = channels[numTrackId];
  if (!channelNode) return;

  const tracks = state.tracks;
  const track = tracks.find((t) => t.id === numTrackId);
  const targetBusId = track ? resolveImmediateBusId(track, tracks) : null;
  const busChannelNode = targetBusId !== null ? busChannels[targetBusId] : null;
  const busTrack = targetBusId !== null ? tracks.find((t) => String(t.id) === String(targetBusId)) : undefined;

  const wasTrackMuted = getEffectiveMuteState(tracks, numTrackId);
  const wasBusMuted = targetBusId !== null ? getEffectiveMuteState(tracks, targetBusId) : false;
  if (!wasTrackMuted && !wasBusMuted) return;

  const panComp = applyMonoCompatiblePan(track?.panVal ?? track?.pan).panCompensationDb;
  const trackPos = resolveTrackEffectiveFaderPos(track, tracks);
  if (wasTrackMuted) applyChannelVolumeLinear(channelNode, trackPos <= 3 ? 75 : trackPos, panComp, false, 0.01);
  if (wasBusMuted && busChannelNode) {
    const busPos = resolveTrackEffectiveFaderPos(busTrack, tracks);
    applyChannelVolumeLinear(busChannelNode, busPos <= 3 ? 75 : busPos, 0, false, 0.01);
  }

  const existing = restoreTimeouts.get(numTrackId);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(() => {
    restoreTimeouts.delete(numTrackId);
    const latest = useSequencerStore.getState();
    if (latest.isPlaying) return;
    const curTrack = latest.tracks.find((t) => t.id === numTrackId);
    const curPanComp = applyMonoCompatiblePan(curTrack?.panVal ?? curTrack?.pan).panCompensationDb;
    applyChannelVolumeLinear(
      channelNode,
      resolveTrackEffectiveFaderPos(curTrack, latest.tracks),
      curPanComp,
      getEffectiveMuteState(latest.tracks, numTrackId),
      0.018
    );
    if (busChannelNode && targetBusId !== null) {
      const curBus = latest.tracks.find((t) => String(t.id) === String(targetBusId));
      applyChannelVolumeLinear(
        busChannelNode,
        resolveTrackEffectiveFaderPos(curBus, latest.tracks),
        0,
        getEffectiveMuteState(latest.tracks, targetBusId),
        0.018
      );
    }
  }, 800);

  restoreTimeouts.set(numTrackId, timeout);
}
