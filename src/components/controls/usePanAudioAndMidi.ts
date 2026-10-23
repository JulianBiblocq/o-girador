/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef } from 'react';
import { channels, busChannels } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { faderPositionToDb } from '../../utils/audioMath';

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
        const { acousticPan, panCompensationDb } = applyMonoCompatiblePan(val);
        const node = track.isBusFolder ? busChannels[track.id] : channels[track.id];
        if (node?.pan) {
          node.pan.rampTo(acousticPan, 0.02);
        }
        if (node?.volume && !track.isBusFolder) {
          const baseDb = faderPositionToDb(track.volumeVal ?? 75);
          if (baseDb > -90) {
            node.volume.rampTo(baseDb + panCompensationDb, 0.02);
          }
        }
      }
    }
  };

  return { updateAudio };
}
