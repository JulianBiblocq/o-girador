/**
 * O Girador - Audibility Guard for Previews and Audition Taps (< 55 lines)
 */
import { channels, busChannels } from '../effectsChain';
import { useSequencerStore, getEffectiveMuteState } from '../../stores/useSequencerStore';

const restoreTimeouts = new Map<number | string, any>();

export function ensureAudiblePreview(trackId: number | string | null): void {
  if (trackId === null || trackId === undefined) return;
  const numTrackId = Number(trackId);
  if (!Number.isFinite(numTrackId)) return;

  const isPlaying = useSequencerStore.getState().isPlaying;
  if (isPlaying) return;

  const channelNode = channels[numTrackId];
  if (!channelNode) return;

  const track = useSequencerStore.getState().tracks.find((t) => t.id === numTrackId);
  const targetBusId = track?.busId || (track?.linkedToTrackId ? track.linkedToTrackId : null);
  const busChannelNode = targetBusId ? busChannels[targetBusId] : null;

  const wasTrackMuted = channelNode.mute;
  const wasBusMuted = busChannelNode ? busChannelNode.mute : false;

  if (wasTrackMuted) channelNode.mute = false;
  if (busChannelNode && wasBusMuted) busChannelNode.mute = false;

  const existing = restoreTimeouts.get(numTrackId);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(() => {
    restoreTimeouts.delete(numTrackId);
    if (useSequencerStore.getState().isPlaying) return;
    const tracks = useSequencerStore.getState().tracks;
    if (wasTrackMuted && channelNode) {
      channelNode.mute = getEffectiveMuteState(tracks, numTrackId);
    }
    if (wasBusMuted && busChannelNode && targetBusId) {
      busChannelNode.mute = getEffectiveMuteState(tracks, targetBusId);
    }
  }, 800);

  restoreTimeouts.set(numTrackId, timeout);
}
