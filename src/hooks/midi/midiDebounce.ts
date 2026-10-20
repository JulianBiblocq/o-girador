import { useSequencerStore } from '../../stores/useSequencerStore';

export const volumeDebounceTimers = new Map<number | 'master', any>();
export const panDebounceTimers = new Map<number, any>();

export function debouncedSaveVolume(trackId: number | 'master', val: number, audio: any) {
  const existing = volumeDebounceTimers.get(trackId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    volumeDebounceTimers.delete(trackId);
    if (trackId === 'master') {
      const db = val === 0 ? -40 : -40 + (val / 100) * 46;
      audio.setMasterVol(db);
    } else {
      useSequencerStore.getState().handleTrackVolumeChange(trackId, val);
    }
  }, 50);
  volumeDebounceTimers.set(trackId, timer);
}

export function debouncedSavePan(trackId: number, val: number) {
  const existing = panDebounceTimers.get(trackId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    panDebounceTimers.delete(trackId);
    useSequencerStore.getState().setTrackPan(trackId, val);
  }, 50);
  panDebounceTimers.set(trackId, timer);
}

export function clearAllMidiDebounceTimers() {
  volumeDebounceTimers.forEach(t => clearTimeout(t));
  volumeDebounceTimers.clear();
  panDebounceTimers.forEach(t => clearTimeout(t));
  panDebounceTimers.clear();
}
