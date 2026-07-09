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
}) => {
  const visualThumbRef = useRef<HTMLDivElement>(null);
  const valueTextRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  // Configuration géométrique correspondant au design (avec valeurs dynamiques ou par défaut)
  const containerHeight = height || 115;
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

  // Durant le glissement (onChange) : Manipulation directe du DOM sans re-render React
  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.round(parseFloat(e.target.value));

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

  // Pointer Down
  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  // Au relâchement : Commit définitif dans Zustand
  const handleCommit = (e: React.SyntheticEvent) => {
    isDraggingRef.current = false;
    const val = Math.round(parseFloat((e.target as HTMLInputElement).value));
    
    updateAudioNode(val);
    onChange(val);
  };

  // Synchronisation lorsque la valeur change depuis l'extérieur (ex: presets)
  useEffect(() => {
    if (!isDraggingRef.current) {
      if (inputRef.current) {
        inputRef.current.value = String(value);
      }
      const topPx = getTopPosition(value);
      if (visualThumbRef.current) {
        visualThumbRef.current.style.top = `${topPx}px`;
      }
      if (valueTextRef.current) {
        valueTextRef.current.textContent = String(value);
      }
      updateAudioNode(value);
    }
  }, [value, trackId]);

  return (
    <div 
      className="flex justify-center items-center relative w-10 select-none"
      style={{ height: `${containerHeight}px` }}
    >
      {/* 1. La fente du fader (Visuel en arrière-plan) */}
      <div 
        className="absolute w-1 bg-[var(--cordel-border)] pointer-events-none z-0"
        style={{ top: `${topPadding}px`, bottom: `${topPadding}px` }}
      ></div>

      {/* 2. Le bouton visuel (Thumb) avec texte centré en Flexbox */}
      <div
        ref={visualThumbRef}
        className="absolute left-1/2 -translate-x-1/2 cordel-border-sm shadow-[0_2px_5px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10 transition-colors"
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

      {/* 3. L'input range invisible (Ghost Input) survolant tout le composant */}
      <input
        ref={inputRef}
        type="range"
        min="0"
        max="100"
        orient="vertical"
        defaultValue={value}
        onChange={handleDrag}
        onPointerDown={handlePointerDown}
        onPointerUp={handleCommit}
        onKeyUp={handleCommit}
        onBlur={handleCommit}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 touch-none"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
        }}
      />
    </div>
  );
};
