import { useSequencerStore, selectTracksMeta, getDisplayedMixerTracks } from '../../stores/useSequencerStore';
import { channels, busChannels, masterVolumeNode } from '../../audio/effectsChain';
import { faderPositionToDb, faderPositionToGain } from '../../utils/audioMath';
import { debouncedSaveVolume } from './midiDebounce';

export function handleMidiPitchBendFaders(
  status: number,
  note: number,
  velocity: number,
  audio: any
): boolean {
  const channel = status & 0x0f;
  const raw14 = (velocity << 7) | note;
  const norm0to1 = Math.max(0, Math.min(1, raw14 / 16383));
  const volumeVal = Math.round(norm0to1 * 100);

  if (channel >= 0 && channel <= 7) {
    const tracksMeta = selectTracksMeta(useSequencerStore.getState());
    const displayedTracks = getDisplayedMixerTracks(tracksMeta);
    const bankOffset = useSequencerStore.getState().mixerBankOffset || 0;
    const targetTrack = displayedTracks[bankOffset + channel];
    if (!targetTrack) return true;
    const targetTrackId = targetTrack.id;

    const channelNode = channels[targetTrackId] || busChannels[targetTrackId];
    if (channelNode && channelNode.volume) {
      const db = faderPositionToDb(volumeVal);
      channelNode.volume.rampTo(Number.isFinite(db) ? db : -100, 0.02);
    }

    window.dispatchEvent(new CustomEvent('midi-fader-move', {
      detail: { targetId: targetTrackId, val: volumeVal }
    }));

    debouncedSaveVolume(targetTrackId, volumeVal, audio);
    return true;
  } else if (channel === 8) {
    if (masterVolumeNode && masterVolumeNode.gain) {
      const gain = faderPositionToGain(volumeVal);
      masterVolumeNode.gain.rampTo(gain, 0.02);
    }

    window.dispatchEvent(new CustomEvent('midi-fader-move', {
      detail: { targetId: 'master', val: volumeVal }
    }));

    debouncedSaveVolume('master', volumeVal, audio);
    return true;
  }
  return false;
}
