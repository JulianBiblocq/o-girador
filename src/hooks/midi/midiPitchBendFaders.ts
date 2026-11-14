import { useSequencerStore, selectTracksMeta, getDisplayedMixerTracks } from '../../stores/useSequencerStore';
import { debouncedSaveVolume } from './midiDebounce';
import { applyRealtimeMasterFader, applyRealtimeTrackOrBusFader } from '../audio-sync/realtimeFaderAudioUpdater';

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

    applyRealtimeTrackOrBusFader(targetTrackId, volumeVal, 0.018);

    window.dispatchEvent(new CustomEvent('midi-fader-move', {
      detail: { targetId: targetTrackId, val: volumeVal }
    }));

    debouncedSaveVolume(targetTrackId, volumeVal, audio);
    return true;
  } else if (channel === 8) {
    applyRealtimeMasterFader(volumeVal, 0.018);

    window.dispatchEvent(new CustomEvent('midi-fader-move', {
      detail: { targetId: 'master', val: volumeVal }
    }));

    debouncedSaveVolume('master', volumeVal, audio);
    return true;
  }
  return false;
}
