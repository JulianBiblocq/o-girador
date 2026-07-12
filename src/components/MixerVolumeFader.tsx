import React, { useRef, useEffect } from 'react';
import { getTone } from '../ToneLoader';
import { channels } from '../hooks/useAudioSync';

function safeGetTone() {
  try {
    return getTone();
  } catch {
    return null;
  }
}

interface MixerVolumeFaderProps {
  trackId?: number;
  value: number; // 0 to 100
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  faderColor?: string;
  textColor?: string;
  height?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  fontSize?: string;
  isMaster?: boolean;
}

export const MixerVolumeFader: React.FC<MixerVolumeFaderProps> = ({
  trackId,
  value,
  onChange,
  onAudioDrag,
  faderColor = '#d4af37',
  textColor = 'var(--cordel-text)',
  height,
  thumbWidth,
  thumbHeight,
  fontSize,
  isMaster = false,
}) => {
  const visualThumbRef = useRef<HTMLDivElement>(null);
  const valueTextRef = useRef<HTMLSpanElement>(null);
  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);

  const [measuredHeight, setMeasuredHeight] = React.useState(height || 115);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (height) {
      setMeasuredHeight(height);
      return;
    }
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const rect = entry.contentRect;
        if (rect.height > 0) {
          setMeasuredHeight(rect.height);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // Configuration géométrique correspondant au design (avec valeurs dynamiques ou par défaut)
  const containerHeight = height || (measuredHeight > 60 ? measuredHeight : 60);
  const faderHeight = containerHeight - 16; // préserve 8px de padding en haut et en bas
  const resolvedThumbHeight = thumbHeight || 20;
  const travelRange = faderHeight - resolvedThumbHeight;
  const topPadding = 8; // padding fixe de 8px en haut

  // Calcule la position "top" en pixels en fonction de la valeur
  const getTopPosition = (val: number) => {
    const ratio = 1 - val / 100;
    return ratio * travelRange + topPadding;
  };

  // Met à jour le gain de Tone.js directement via l'Audio API
  const updateAudioNode = (val: number) => {
    if (onAudioDrag) {
      onAudioDrag(val);
      return;
    }
    if (trackId !== undefined) {
      const channelNode = channels[trackId];
      if (channelNode) {
        const gain = Math.max(0.00001, val / 100);
        const toneInstance = safeGetTone();
        const db = val === 0 ? -Infinity : toneInstance ? toneInstance.gainToDb(gain) : 0;
        channelNode.volume.rampTo(db, 0.05);
      }
    }
  };

  // Calcule la valeur du volume en fonction de la position verticale (clientY)
  const calculateValueFromPointer = (clientY: number) => {
    const rect = rectRef.current;
    if (!rect) return value;
    const relativeY = clientY - rect.top;

    const startY = topPadding + resolvedThumbHeight / 2;
    const endY = containerHeight - topPadding - resolvedThumbHeight / 2;
    const totalTravel = endY - startY;

    if (totalTravel <= 0) return 0;

    let ratio = (relativeY - startY) / totalTravel;
    ratio = Math.min(1, Math.max(0, ratio));
    return Math.round((1 - ratio) * 100);
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

    const val = calculateValueFromPointer(e.clientY);

    // 1. Déplacement immédiat du bouton visuel
    const topPx = getTopPosition(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }

    // 2. Mise à jour immédiate du texte
    if (valueTextRef.current) {
      valueTextRef.current.textContent = String(val);
    }

    // 3. Mise à jour directe du volume Web Audio API (Tone.js)
    updateAudioNode(val);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();

    const val = calculateValueFromPointer(e.clientY);

    // 1. Déplacement immédiat du bouton visuel
    const topPx = getTopPosition(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }

    // 2. Mise à jour immédiate du texte
    if (valueTextRef.current) {
      valueTextRef.current.textContent = String(val);
    }

    // 3. Mise à jour directe du volume Web Audio API (Tone.js)
    updateAudioNode(val);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const val = calculateValueFromPointer(e.clientY);

    updateAudioNode(val);
    onChange(val);
  };

  // Synchronisation lorsque la valeur change depuis l'extérieur (ex: presets)
  useEffect(() => {
    if (!isDraggingRef.current) {
      const topPx = getTopPosition(value);
      if (visualThumbRef.current) {
        visualThumbRef.current.style.top = `${topPx}px`;
      }
      if (valueTextRef.current) {
        valueTextRef.current.textContent = String(value);
      }
      updateAudioNode(value);
    }
  }, [value, trackId, containerHeight]);

  return (
    <div 
      ref={containerRef}
      className="flex justify-center items-center relative w-10 select-none h-full cursor-pointer touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ 
        height: height !== undefined ? `${height}px` : '100%',
        minHeight: height !== undefined ? `${height}px` : '60px'
      }}
    >
      {/* 1. La fente du fader (Visuel en arrière-plan) */}
      <div 
        className="absolute w-1 bg-[var(--cordel-border)] pointer-events-none z-0"
        style={{ top: `${topPadding}px`, bottom: `${topPadding}px` }}
      ></div>

      {/* 2. Le bouton visuel (Thumb) avec texte centré en Flexbox */}
      <div
        ref={visualThumbRef}
        className={`absolute left-1/2 -translate-x-1/2 shadow-[0_2px_5px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10 transition-colors ${
          isMaster ? 'master-fader-thumb' : 'cordel-border-sm'
        }`}
        style={{
          width: `${thumbWidth || 32}px`,
          height: `${resolvedThumbHeight}px`,
          top: `${getTopPosition(value)}px`,
          backgroundColor: faderColor,
          borderColor: 'var(--cordel-border)',
        }}
      >
        <span
          ref={valueTextRef}
          className={`${fontSize || 'text-[10px]'} font-black font-mono select-none`}
          style={{ color: textColor }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};
