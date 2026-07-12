import React, { useEffect, useRef } from 'react';
import { getTone } from '@/src/ToneLoader';
import { channels, reverbSends, masterVolumeNode, masterEQNode, masterCompressorNode, metroChannel, masterReverbVolumeNode, reverbNode } from '../hooks/useAudioSync';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface AudioFaderProps {
  value: number;
  onChange: (val: number) => void;
  audioTarget?: 'trackVolume' | 'trackPan' | 'trackReverb' | 'masterVolume' | 'metroVolume' | 'eqLow' | 'eqMid' | 'eqHigh' | 'compThreshold' | 'compRatio' | 'masterReverbVol' | 'reverbDecay';
  trackId?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const AudioFader: React.FC<AudioFaderProps> = ({ 
  value, 
  onChange, 
  audioTarget, 
  trackId, 
  min = 0, 
  max = 100, 
  step = 1, 
  className, 
  style 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualThumbRef = useRef<HTMLDivElement>(null);
  
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const lastAudioUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 25; // 40 Hz limit

  const numMin = parseFloat(String(min));
  const numMax = parseFloat(String(max));
  const numStep = parseFloat(String(step));

  const getPercentage = (val: number) => {
    if (numMax === numMin) return 0;
    return ((val - numMin) / (numMax - numMin)) * 100;
  };

  const updateLabelText = (val: number) => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    let label = containerEl.parentElement?.querySelector('.fader-val-label');
    if (!label && containerEl.parentElement?.parentElement) {
      label = containerEl.parentElement.parentElement.querySelector('.fader-val-label');
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
      const targetDb = val === 0 ? -Infinity : safeGetTone()!.gainToDb(gain);
      try {
        if (reverbSends[trackId].gain.units === 'decibels') {
          reverbSends[trackId].gain.rampTo(targetDb, 0.05);
        } else {
          reverbSends[trackId].gain.rampTo(val === 0 ? 0 : gain, 0.05);
        }
      } catch (err) {
        console.warn("Could not set fader reverb level:", err);
      }
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
      const pct = getPercentage(value);
      if (visualThumbRef.current) {
        visualThumbRef.current.style.left = `${pct}%`;
      }
      updateLabelText(value);
      updateAudio(value, true);
    }
  }, [value, audioTarget, trackId]);

  const calculateValueFromPointer = (clientX: number) => {
    const rect = rectRef.current;
    if (!rect) return value;
    const relativeX = clientX - rect.left;
    
    let ratio = relativeX / rect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    
    let val = numMin + ratio * (numMax - numMin);
    
    // Align with step
    const steps = Math.round((val - numMin) / numStep);
    val = numMin + steps * numStep;
    
    val = Math.min(numMax, Math.max(numMin, val));
    return val;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect();
    }

    const val = calculateValueFromPointer(e.clientX);
    
    // Direct DOM updates
    const pct = getPercentage(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.left = `${pct}%`;
    }
    updateLabelText(val);
    updateAudio(val, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    
    const val = calculateValueFromPointer(e.clientX);

    // Direct DOM updates
    const pct = getPercentage(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.left = `${pct}%`;
    }
    updateLabelText(val);
    updateAudio(val, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const val = calculateValueFromPointer(e.clientX);
    updateAudio(val, true);
    onChange(val);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative select-none touch-none cursor-pointer ${className || ''}`}
      style={{
        ...style,
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {/* Visual thumb inside the rail */}
      <div
        ref={visualThumbRef}
        className="absolute w-3 h-4 bg-[var(--cordel-border)] border border-[var(--cordel-bg)] -translate-x-1/2 -translate-y-1/2 top-1/2 pointer-events-none"
        style={{
          left: `${getPercentage(value)}%`
        }}
      />
    </div>
  );
};
