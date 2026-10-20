/**
 * O Girador - Vocal Output Node Resolution
 * Routes: Child Vocal Track -> Toada Bus -> Master (Strictly forbids Tone.Destination)
 */

import { useSequencerStore, isToadaBus } from '../../stores/useSequencerStore';
import { channels, busChannels, trackInputs, masterVolumeNode } from '../effectsChain';
import { instrumentsConfig } from '../../data';

export function resolveVocalOutputNode(trackId?: string | number, isCoroTrack?: boolean): any {
  const store = useSequencerStore.getState();
  const tracks = store.tracks;
  const toadaTrack = tracks.find(t => isToadaBus(t));
  const toadaBusNode = toadaTrack ? (busChannels[toadaTrack.id] || (busChannels as any)[String(toadaTrack.id)]) : null;

  if (trackId !== undefined && trackId !== null) {
    const directChannel = (trackInputs && (trackInputs as any)[trackId]) || (channels && (channels as any)[trackId]);
    if (directChannel) return directChannel;
  }

  const puxTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  if (isCoroTrack && coroTrack) {
    const coroChannel = (trackInputs && (trackInputs as any)[coroTrack.id]) || (channels && (channels as any)[coroTrack.id]);
    if (coroChannel) return coroChannel;
  } else if (!isCoroTrack && puxTrack) {
    const puxChannel = (trackInputs && (trackInputs as any)[puxTrack.id]) || (channels && (channels as any)[puxTrack.id]);
    if (puxChannel) return puxChannel;
  }

  if (toadaBusNode) return toadaBusNode;
  return masterVolumeNode;
}
