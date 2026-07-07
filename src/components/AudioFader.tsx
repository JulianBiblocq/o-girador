import React, { useState, useEffect, useRef } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';
import { channels, reverbSends, masterVolumeNode, masterEQNode, masterCompressorNode, metroChannel, masterReverbVolumeNode, reverbNode } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface AudioFaderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onChange: (val: number) => void;
  audioTarget?: 'trackVolume' | 'trackPan' | 'trackReverb' | 'masterVolume' | 'metroVolume' | 'eqLow' | 'eqMid' | 'eqHigh' | 'compThreshold' | 'compRatio' | 'masterReverbVol' | 'reverbDecay';
  trackId?: number;
}

export const AudioFader: React.FC<AudioFaderProps> = ({ value, onChange, audioTarget, trackId, ...props }) => {
  const [localVal, setLocalVal] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isDraggingRef = useRef(false);

  useEffect(() => {
    // Si l'utilisateur est en train de glisser sous son doigt,
    // on ignore les mises à jour descendantes de Zustand pour éviter le saut visuel.
    if (!isDraggingRef.current) {
      setLocalVal(value);
    }
  }, [value]);

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalVal(val);

    let instId: string | null = null;
    if (trackId !== undefined) {
      const track = useSequencerStore.getState().tracks.find(t => t.id === trackId);
      if (track) {
        const inst = instrumentsConfig[track.instrumentIdx];
        if (inst) {
          instId = inst.id;
        }
      }
    }

    // Règle 1 : Mutation Audio Directe immédiate (Direct-to-WebAudio) avec 0.05s de lissage
    if (audioTarget === 'trackVolume' && instId && channels[instId]) {
      const gain = Math.max(0.00001, val / 100);
      const db = val === 0 ? -Infinity : safeGetTone()!.gainToDb(gain);
      channels[instId].volume.rampTo(db, 0.05);
    } else if (audioTarget === 'trackPan' && instId && channels[instId]) {
      channels[instId].pan.rampTo(val / 100, 0.05);
    } else if (audioTarget === 'trackReverb' && instId && reverbSends[instId]) {
      const gain = Math.max(0.00001, val / 100);
      reverbSends[instId].gain.rampTo(val === 0 ? 0 : safeGetTone()!.dbToGain(safeGetTone()!.gainToDb(gain)), 0.05);
    } else if (audioTarget === 'masterVolume' && masterVolumeNode) {
      masterVolumeNode.gain.rampTo(safeGetTone()?.dbToGain(val === -40 ? -Infinity : val), 0.05);
    } else if (audioTarget === 'metroVolume' && metroChannel) {
      const gain = Math.max(0.00001, val / 100);
      metroChannel.volume.rampTo(val === 0 ? -Infinity : safeGetTone()!.gainToDb(gain), 0.05);
    } else if (audioTarget === 'eqLow' && masterEQNode) {
      masterEQNode.low.rampTo(val, 0.05);
    } else if (audioTarget === 'eqMid' && masterEQNode) {
      masterEQNode.mid.rampTo(val, 0.05);
    } else if (audioTarget === 'eqHigh' && masterEQNode) {
      masterEQNode.high.rampTo(val, 0.05);
    } else if (audioTarget === 'compThreshold' && masterCompressorNode) {
      masterCompressorNode.threshold.rampTo(val, 0.05);
    } else if (audioTarget === 'compRatio' && masterCompressorNode) {
      masterCompressorNode.ratio.rampTo(val, 0.05);
    } else if (audioTarget === 'masterReverbVol' && masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(safeGetTone()?.dbToGain(val === -40 ? -Infinity : val), 0.05);
    } else if (audioTarget === 'reverbDecay' && reverbNode) {
      try {
        reverbNode.decay = val;
      } catch (err) {
        console.warn("Error setting reverb decay:", err);
      }
    }

    // Règle 1 (Bis) : Mutation directe du DOM (Vanilla JS) en dehors du cycle React pour le label
    const container = e.target.closest('.flex-col') || e.target.parentElement;
    if (container) {
      const label = container.querySelector('.fader-val-label');
      if (label) {
        if (audioTarget === 'masterReverbVol' || audioTarget === 'masterVolume') {
          label.textContent = val === -40 ? 'Mute' : `${val > 0 ? '+' : ''}${val} dB`;
        } else if (audioTarget === 'trackVolume' || audioTarget === 'metroVolume') {
          label.textContent = `${Math.round(val)}%`;
        } else if (audioTarget === 'trackReverb') {
          label.textContent = `${Math.round(val)}`;
        } else if (audioTarget === 'eqLow' || audioTarget === 'eqMid' || audioTarget === 'eqHigh') {
          label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
        } else if (audioTarget === 'compThreshold') {
          label.textContent = `${val} dB`;
        } else if (audioTarget === 'compRatio') {
          label.textContent = `${val.toFixed(1)}:1`;
        } else if (audioTarget === 'reverbDecay') {
          label.textContent = `${val.toFixed(1)} s`;
        }
      }
    }
  };

  // Commit final pour s'assurer que la valeur est synchronisée dans Zustand à la fin du glissement
  const handleCommit = (e: React.SyntheticEvent) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    isDraggingRef.current = false;
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  return (
    <input
      type="range"
      value={localVal}
      onChange={handleDrag}
      onPointerDown={handlePointerDown}
      onPointerUp={handleCommit}
      onKeyUp={handleCommit}
      onBlur={handleCommit}
      {...props}
    />
  );
};
