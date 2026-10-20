import { useEffect, useRef } from 'react';
import { channels, busChannels } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function usePanAudioAndMidi(
  trackId: number | undefined,
  updateVisuals: (val: number) => void
) {
  const lastAudioUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 25;

  useEffect(() => {
    const handleMidiPan = (e: Event) => {
      const customEv = e as CustomEvent<{ targetId: number; val: number }>;
      const { targetId, val } = customEv.detail || {};
      if (targetId !== trackId) return;
      updateVisuals(val);
    };
    window.addEventListener('midi-pan-move', handleMidiPan);
    return () => window.removeEventListener('midi-pan-move', handleMidiPan);
  }, [trackId, updateVisuals]);

  const updateAudio = (val: number, force = false) => {
    const now = performance.now();
    if (!force && now - lastAudioUpdateTimeRef.current < THROTTLE_MS) return;
    lastAudioUpdateTimeRef.current = now;

    if (trackId !== undefined) {
      const track = useSequencerStore.getState().tracks.find(t => t.id === trackId);
      if (track) {
        const targetPan = val / 100;
        if (track.isBusFolder) {
          if (busChannels && busChannels[track.id]) busChannels[track.id].pan.rampTo(targetPan, 0.02);
        } else {
          if (channels && channels[track.id]) channels[track.id].pan.rampTo(targetPan, 0.02);
        }
      }
    }
  };

  return { updateAudio };
}
