import { useSequencerStore, selectTracksMeta, getDisplayedMixerTracks } from '../../stores/useSequencerStore';
import { channels, busChannels, masterVolumeNode } from '../../audio/effectsChain';
import { faderPositionToDb, faderPositionToGain } from '../../utils/audioMath';
import { debouncedSaveVolume, debouncedSavePan } from './midiDebounce';

let lastCcBankActionTime = 0;

export function handleMidiContinuousCc(
  status: number,
  note: number,
  velocity: number,
  audio: any
): boolean {
  // Navigation banques en CC (touches 46, 47, 48, 49) avec anti-rebond
  if ([46, 47, 48, 49].includes(note)) {
    if (velocity === 0) return true;
    const now = Date.now();
    if (now - lastCcBankActionTime < 250) return true;
    lastCcBankActionTime = now;

    if (note === 48) useSequencerStore.getState().shiftMixerBank(-1);
    else if (note === 49) useSequencerStore.getState().shiftMixerBank(1);
    else if (note === 46) useSequencerStore.getState().shiftMixerBank(-8);
    else if (note === 47) useSequencerStore.getState().jumpMixerBank8();
    return true;
  }

  // A. Faders de volume (CC 73 à 80 pour tranches 1 à 8, CC 81/82/83/85 ou CC 7 canal 8 pour Master)
  let faderIdx: number | 'master' | null = null;
  if (note >= 73 && note <= 80) {
    faderIdx = note - 73;
  } else if (note === 7) {
    const ch = status & 0x0f;
    if (ch <= 7) faderIdx = ch;
    else if (ch === 8) faderIdx = 'master';
  } else if (note === 81 || note === 82 || note === 83 || note === 85) {
    faderIdx = 'master';
  }

  if (faderIdx !== null) {
    const norm0to1 = Math.max(0, Math.min(1, velocity / 127));
    const volumeVal = Math.round(norm0to1 * 100);

    if (typeof faderIdx === 'number') {
      const tracksMeta = selectTracksMeta(useSequencerStore.getState());
      const displayedTracks = getDisplayedMixerTracks(tracksMeta);
      const bankOffset = useSequencerStore.getState().mixerBankOffset || 0;
      const targetTrack = displayedTracks[bankOffset + faderIdx];
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
    } else if (faderIdx === 'master') {
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
  }

  // B. Potentiomètres (Knobs) 1 à 8 (CC 16 à 23) -> Panoramique
  if (note >= 16 && note <= 23) {
    const knobIdx = note - 16;
    const tracksMeta = selectTracksMeta(useSequencerStore.getState());
    const displayedTracks = getDisplayedMixerTracks(tracksMeta);
    const bankOffset = useSequencerStore.getState().mixerBankOffset || 0;
    const targetTrack = displayedTracks[bankOffset + knobIdx];
    if (!targetTrack) return true;
    const targetTrackId = targetTrack.id;

    const currentTrack = useSequencerStore.getState().tracks.find(t => t.id === targetTrackId);
    const currentPan = currentTrack?.panVal ?? currentTrack?.pan ?? 0;

    let newPan = currentPan;
    if ((velocity >= 1 && velocity <= 15) || (velocity >= 65 && velocity <= 79)) {
      const delta = velocity > 64 ? -(velocity - 64) : velocity;
      newPan = Math.max(-100, Math.min(100, currentPan + delta * 3));
    } else {
      newPan = Math.round((velocity / 127) * 200 - 100);
    }

    const channelNode = channels[targetTrackId] || busChannels[targetTrackId];
    if (channelNode) channelNode.pan.rampTo(newPan / 100, 0.02);

    window.dispatchEvent(new CustomEvent('midi-pan-move', {
      detail: { targetId: targetTrackId, val: newPan }
    }));

    debouncedSavePan(targetTrackId, newPan);
    return true;
  }

  return false;
}
