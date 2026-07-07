import React, { useEffect, useRef } from 'react';
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
  orient?: string;
}

export const AudioFader: React.FC<AudioFaderProps> = ({ value, onChange, audioTarget, trackId, ...props }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isDraggingRef = useRef(false);
  const lastAudioUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 25; // 40 Hz limit

  const updateLabelText = (val: number) => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    let label = inputEl.parentElement?.querySelector('.fader-val-label');
    if (!label && inputEl.parentElement?.parentElement) {
      label = inputEl.parentElement.parentElement.querySelector('.fader-val-label');
    }
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
  };

  const updateAudio = (val: number, force = false) => {
    const now = performance.now();
    if (!force && now - lastAudioUpdateTimeRef.current < THROTTLE_MS) {
      return;
    }
    lastAudioUpdateTimeRef.current = now;

    // Direct-to-WebAudio with 0.05s smoothing
    if (audioTarget === 'trackVolume' && trackId !== undefined && channels[trackId]) {
      const gain = Math.max(0.00001, val / 100);
      const db = val === 0 ? -Infinity : safeGetTone()!.gainToDb(gain);
      channels[trackId].volume.rampTo(db, 0.05);
    } else if (audioTarget === 'trackPan' && trackId !== undefined && channels[trackId]) {
      channels[trackId].pan.rampTo(val / 100, 0.05);
    } else if (audioTarget === 'trackReverb' && trackId !== undefined && reverbSends[trackId]) {
      const gain = Math.max(0.00001, val / 100);
      reverbSends[trackId].gain.rampTo(val === 0 ? 0 : safeGetTone()!.dbToGain(safeGetTone()!.gainToDb(gain)), 0.05);
    } else if (audioTarget === 'masterVolume' && masterVolumeNode) {
      masterVolumeNode.gain.rampTo(safeGetTone()?.dbToGain(val === -40 ? -Infinity : val), 0.05);
    } else if (audioTarget === 'metroVolume' && metroChannel) {
      const gain = Math.max(0.00001, val / 100);
      metroChannel.volume.rampTo(val === 0 ? -Infinity : safeGetTone()!.gainToDb(gain), 0.05);
    } else if (audioTarget === 'eqLow' && masterEQNode) {
      masterEQNode.low.linearRampToValueAtTime(val, (safeGetTone()?.now() ?? 0) + 0.05);
    } else if (audioTarget === 'eqMid' && masterEQNode) {
      masterEQNode.mid.linearRampToValueAtTime(val, (safeGetTone()?.now() ?? 0) + 0.05);
    } else if (audioTarget === 'eqHigh' && masterEQNode) {
      masterEQNode.high.linearRampToValueAtTime(val, (safeGetTone()?.now() ?? 0) + 0.05);
    } else if (audioTarget === 'compThreshold' && masterCompressorNode) {
      masterCompressorNode.threshold.linearRampToValueAtTime(val, (safeGetTone()?.now() ?? 0) + 0.05);
    } else if (audioTarget === 'compRatio' && masterCompressorNode) {
      masterCompressorNode.ratio.linearRampToValueAtTime(val, (safeGetTone()?.now() ?? 0) + 0.05);
    } else if (audioTarget === 'masterReverbVol' && masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(safeGetTone()?.dbToGain(val === -40 ? -Infinity : val), 0.05);
    } else if (audioTarget === 'reverbDecay' && reverbNode) {
      try {
        reverbNode.decay = val;
      } catch (err) {
        console.warn("Error setting reverb decay:", err);
      }
    }
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      if (inputRef.current) {
        inputRef.current.value = String(value);
      }
      updateLabelText(value);
      updateAudio(value, true);
    }
  }, [value, audioTarget, trackId]);

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateLabelText(val);
    updateAudio(val, false);
  };

  const handleCommit = (e: React.SyntheticEvent) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    isDraggingRef.current = false;
    updateAudio(val, true);
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  const combinedClassName = `${props.className || ''} touch-none`.trim();

  return (
    <input
      ref={inputRef}
      type="range"
      defaultValue={value}
      onChange={handleDrag}
      onPointerDown={handlePointerDown}
      onPointerUp={handleCommit}
      onKeyUp={handleCommit}
      onBlur={handleCommit}
      {...props}
      className={combinedClassName}
    />
  );
};
