/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { channels, busChannels } from '../hooks/useAudioSync';
import { 
  faderPositionToDb, 
  faderPositionToDbString, 
  UNITY_GAIN_FADER_POSITION,
  CUTOFF_FADER_POSITION,
  dbToFaderPosition,
  parseDbInput
} from '../utils/audioMath';

interface MixerVolumeFaderProps {
  trackId?: number;
  value: number; // 0 to 100 (75 = 0.0 dB Unity Gain)
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  defaultValue?: number;
  faderColor?: string;
  textColor?: string;
  height?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  fontSize?: string;
  isMaster?: boolean;
  faderHandleRef?: React.RefObject<HTMLDivElement | null>;
  valueTextRefProp?: React.RefObject<HTMLSpanElement | null>;
  travelRangeRef?: React.MutableRefObject<number>;
}

export const MixerVolumeFader: React.FC<MixerVolumeFaderProps> = ({
  trackId,
  value,
  onChange,
  onAudioDrag,
  defaultValue = UNITY_GAIN_FADER_POSITION,
  faderColor,
  textColor = 'var(--cordel-text)',
  height,
  thumbWidth,
  thumbHeight,
  fontSize,
  isMaster = false,
  faderHandleRef,
  valueTextRefProp,
  travelRangeRef,
}) => {
  const resolvedFaderColor = faderColor || (isMaster ? 'var(--master-fader-thumb)' : '#d4af37');
  const visualThumbRef = useRef<HTMLDivElement>(null);
  const valueTextRef = useRef<HTMLSpanElement>(null);
  const cartoucheRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const lastCartoucheTouchTimeRef = useRef<number>(0);

  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const setThumbRef = (el: HTMLDivElement | null) => {
    (visualThumbRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (faderHandleRef) {
      (faderHandleRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  };

  const setTextRef = (el: HTMLSpanElement | null) => {
    (valueTextRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    if (valueTextRefProp) {
      (valueTextRefProp as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    }
  };

  const [measuredHeight, setMeasuredHeight] = React.useState(height || 115);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (height) {
      setMeasuredHeight(height);
      return;
    }
    if (!trackAreaRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        if (rect.height > 0) {
          setMeasuredHeight(rect.height);
        }
      }
    });
    observer.observe(trackAreaRef.current);
    return () => observer.disconnect();
  }, [height]);

  // Dimensions géométriques de la course utile (Track Area)
  const trackAreaHeight = height ? height - 20 : (measuredHeight > 40 ? measuredHeight : 60);
  const resolvedThumbHeight = thumbHeight || 20;
  const resolvedThumbWidth = thumbWidth || (isMaster ? 44 : 32);
  const topPadding = 6;
  const bottomPadding = 6;
  const travelRange = Math.max(10, trackAreaHeight - topPadding - bottomPadding - resolvedThumbHeight);

  if (travelRangeRef) {
    travelRangeRef.current = travelRange;
  }

  // Calcule la position "top" en pixels en fonction de la valeur (0 à 100)
  const getTopPosition = (val: number) => {
    const ratio = 1 - Math.max(0, Math.min(100, val)) / 100;
    return ratio * travelRange + topPadding;
  };

  // Position exacte du repère Unity Gain (75 % de hauteur utile depuis le bas = 25 % depuis le haut)
  const unityTop = 0.25 * travelRange + topPadding + resolvedThumbHeight / 2;

  // Met à jour l'audio en direct sans re-render React (Zero Render Thrashing)
  const updateAudioNode = (val: number) => {
    if (onAudioDrag) {
      onAudioDrag(val);
      return;
    }
    if (trackId !== undefined) {
      const channelNode = channels[trackId] || (busChannels ? busChannels[trackId] : undefined);
      if (channelNode && channelNode.volume) {
        const db = faderPositionToDb(val);
        // Si <= 3 (-Infinity), descendre à -100 dB pour garantir la coupure absolue sans erreur WebAudio
        const safeDb = Number.isFinite(db) ? db : -100;
        channelNode.volume.rampTo(safeDb, 0.02);
      }
    }
  };

  // Réinitialisation instantanée à Unity Gain (75 = 0.0 dB / defaultValue)
  const resetToUnity = (e?: React.SyntheticEvent | Event) => {
    if (e) {
      if (typeof (e as any).preventDefault === 'function') (e as any).preventDefault();
      if (typeof (e as any).stopPropagation === 'function') (e as any).stopPropagation();
    }
    setIsEditing(false);
    const unityPos = defaultValue !== undefined ? defaultValue : UNITY_GAIN_FADER_POSITION;
    const topPx = getTopPosition(unityPos);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }
    if (valueTextRef.current) {
      valueTextRef.current.textContent = faderPositionToDbString(unityPos);
    }
    updateAudioNode(unityPos);
    onChange(unityPos);
  };

  // Clic simple sur la cartouche : bascule en mode saisie numérique
  const handleCartoucheClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVal = value ?? defaultValue ?? UNITY_GAIN_FADER_POSITION;
    const currentDb = faderPositionToDb(currentVal);
    let str = '';
    if (!Number.isFinite(currentDb) || currentDb <= -60) {
      str = '-inf';
    } else if (Math.abs(currentDb) < 0.05) {
      str = '0.0';
    } else if (currentDb > 0) {
      str = `+${currentDb.toFixed(1)}`;
    } else {
      const isClean = Math.abs(Math.round(currentDb) - currentDb) < 0.08;
      str = isClean ? `${Math.round(currentDb)}` : currentDb.toFixed(1);
    }
    setInputValue(str);
    setIsEditing(true);
  };

  // Validation de la saisie numérique en dB
  const commitInput = () => {
    if (!isEditing) return;
    setIsEditing(false);
    const dbVal = parseDbInput(inputValue);
    const newPos = Math.round(dbToFaderPosition(dbVal));
    const topPx = getTopPosition(newPos);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }
    if (valueTextRef.current) {
      valueTextRef.current.textContent = faderPositionToDbString(newPos);
    }
    updateAudioNode(newPos);
    onChange(newPos);
  };

  // Calcule la valeur (0-100) en fonction du pointer vertical
  const calculateValueFromPointer = (clientY: number) => {
    const rect = rectRef.current;
    if (!rect) return value;
    const relativeY = clientY - rect.top;

    const startY = topPadding + resolvedThumbHeight / 2;
    const endY = trackAreaHeight - bottomPadding - resolvedThumbHeight / 2;
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

    if (trackAreaRef.current) {
      rectRef.current = trackAreaRef.current.getBoundingClientRect();
    }

    const val = calculateValueFromPointer(e.clientY);

    // 1. Déplacement immédiat du curseur visuel
    const topPx = getTopPosition(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }

    // 2. Mise à jour immédiate du texte en dB (Zero Render Thrashing)
    if (valueTextRef.current) {
      valueTextRef.current.textContent = faderPositionToDbString(val);
    }

    // 3. Mise à jour directe du volume Web Audio API (Tone.js)
    updateAudioNode(val);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();

    const val = calculateValueFromPointer(e.clientY);

    const topPx = getTopPosition(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }

    if (valueTextRef.current) {
      valueTextRef.current.textContent = faderPositionToDbString(val);
    }

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

  // Écouteur tactile natif non-passif pour blocage strict des gestes et détection de double-tap
  useEffect(() => {
    const el = trackAreaRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const now = performance.now();
        // Protection anti-zoom tablette + reset double-tap (< 300 ms)
        if (now - lastTouchTimeRef.current < 300) {
          e.preventDefault();
          lastTouchTimeRef.current = 0;
          resetToUnity(e);
          return;
        }
        lastTouchTimeRef.current = now;

        e.preventDefault();
        isDraggingRef.current = true;
        rectRef.current = el.getBoundingClientRect();
        const touch = e.touches[0];
        const val = calculateValueFromPointer(touch.clientY);
        const topPx = getTopPosition(val);
        if (visualThumbRef.current) {
          visualThumbRef.current.style.top = `${topPx}px`;
        }
        if (valueTextRef.current) {
          valueTextRef.current.textContent = faderPositionToDbString(val);
        }
        updateAudioNode(val);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        const val = calculateValueFromPointer(touch.clientY);
        const topPx = getTopPosition(val);
        if (visualThumbRef.current) {
          visualThumbRef.current.style.top = `${topPx}px`;
        }
        if (valueTextRef.current) {
          valueTextRef.current.textContent = faderPositionToDbString(val);
        }
        updateAudioNode(val);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          const val = calculateValueFromPointer(touch.clientY);
          updateAudioNode(val);
          onChange(val);
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [trackAreaHeight]);

  // Écouteur tactile natif non-passif pour détection de double-tap (< 300 ms) sur le cartouche dB
  useEffect(() => {
    const el = cartoucheRef.current;
    if (!el) return;

    const handleCartoucheTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const now = performance.now();
        if (now - lastCartoucheTouchTimeRef.current < 300) {
          e.preventDefault();
          lastCartoucheTouchTimeRef.current = 0;
          resetToUnity(e);
          setIsEditing(false);
          return;
        }
        lastCartoucheTouchTimeRef.current = now;
      }
    };

    el.addEventListener('touchstart', handleCartoucheTouch, { passive: false });
    return () => {
      el.removeEventListener('touchstart', handleCartoucheTouch);
    };
  }, [defaultValue, trackAreaHeight]);

  // Synchronisation lorsque la valeur change depuis l'extérieur (ex: chargement de preset)
  useEffect(() => {
    if (!isDraggingRef.current && !isEditing) {
      const activeVal = value ?? defaultValue ?? UNITY_GAIN_FADER_POSITION;
      const topPx = getTopPosition(activeVal);
      if (visualThumbRef.current) {
        visualThumbRef.current.style.top = `${topPx}px`;
      }
      if (valueTextRef.current) {
        valueTextRef.current.textContent = faderPositionToDbString(activeVal);
      }
      updateAudioNode(activeVal);
    }
  }, [value, defaultValue, trackId, trackAreaHeight, isEditing]);

  // Haute performance : Écouteur direct d'événement MIDI Fader (Bypass React & Zero Render Thrashing)
  useEffect(() => {
    const handleMidiFader = (e: Event) => {
      const customEv = e as CustomEvent<{ targetId: number | 'master'; val: number }>;
      const { targetId, val } = customEv.detail || {};
      const isCurrent = isMaster ? targetId === 'master' : targetId === trackId;
      if (!isCurrent) return;

      const topPx = getTopPosition(val);
      if (visualThumbRef.current) {
        visualThumbRef.current.style.top = `${topPx}px`;
      }
      if (valueTextRef.current) {
        valueTextRef.current.textContent = faderPositionToDbString(val);
      }
    };

    window.addEventListener('midi-fader-move', handleMidiFader);
    return () => window.removeEventListener('midi-fader-move', handleMidiFader);
  }, [trackId, isMaster, travelRange, topPadding]);

  return (
    <div 
      ref={containerRef}
      className="flex flex-col justify-between items-center relative w-full select-none h-full touch-none"
      style={{ 
        height: height !== undefined ? `${height}px` : '100%',
        minHeight: height !== undefined ? `${height}px` : '60px'
      }}
    >
      {/* Zone utile de déplacement du fader */}
      <div
        ref={trackAreaRef}
        className="flex-1 w-full relative flex items-center justify-center min-h-[44px] cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={resetToUnity}
      >
        {/* 1. La fente du fader (rainure en arrière-plan) */}
        <div 
          className="absolute w-1 bg-[var(--cordel-border)] pointer-events-none z-0"
          style={{ top: `${topPadding}px`, bottom: `${bottomPadding}px` }}
        />

        {/* 2. Repères visuels francs de sérigraphie à 75 % (Unity Gain 0.0 dB / U) */}
        {/* Repère gauche (U) */}
        <div
          className="absolute flex items-center justify-end pointer-events-none z-0"
          style={{
            top: `${unityTop}px`,
            right: `calc(50% + ${(resolvedThumbWidth / 2) + 2}px)`,
            transform: 'translateY(-50%)',
          }}
        >
          <span className="text-[8px] font-mono font-black text-[var(--cordel-text)] opacity-80 mr-0.5 select-none leading-none">
            U
          </span>
          <div className="w-1.5 h-[1.5px] bg-[var(--cordel-border)] opacity-85" />
        </div>

        {/* Repère central sur la rainure */}
        <div
          className="absolute w-2.5 h-[1px] bg-[var(--cordel-border)] opacity-70 pointer-events-none z-0 -translate-x-1/2 left-1/2"
          style={{
            top: `${unityTop}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Repère droit (0 dB) */}
        <div
          className="absolute flex items-center pointer-events-none z-0"
          style={{
            top: `${unityTop}px`,
            left: `calc(50% + ${(resolvedThumbWidth / 2) + 2}px)`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="w-1.5 h-[1.5px] bg-[var(--cordel-border)] opacity-85" />
          <span className="text-[8px] font-mono font-black text-[var(--cordel-text)] opacity-80 ml-0.5 select-none leading-none">
            0
          </span>
        </div>

        {/* 3. Le bouton visuel (Thumb) avec ligne centrale haute précision */}
        <div
          ref={setThumbRef}
          className={`absolute shadow-[0_2px_5px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10 transition-colors ${
            isMaster ? 'master-fader-thumb' : 'cordel-border-sm'
          }`}
          style={{
            width: `${resolvedThumbWidth}px`,
            height: `${resolvedThumbHeight}px`,
            left: `calc(50% - ${resolvedThumbWidth / 2}px)`,
            top: `${getTopPosition(value)}px`,
            backgroundColor: resolvedFaderColor,
            borderColor: isMaster ? 'var(--master-border, var(--cordel-border))' : 'var(--cordel-border)',
          }}
        >
          {/* Ligne centrale nette pour alignement au millimètre sur le repère 75 % */}
          <div
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[var(--cordel-cream,var(--cordel-bg))] opacity-90 shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* 4. Cartouche numérique sous le fader : retour dynamique au format dB & double-clic/saisie directe */}
      <div 
        ref={cartoucheRef}
        data-testid="fader-db-cartouche"
        onClick={!isEditing ? handleCartoucheClick : undefined}
        onDoubleClick={(e) => {
          resetToUnity(e);
          setIsEditing(false);
        }}
        title="Cliquer pour éditer, double-cliquer pour réinitialiser à 0.0 dB"
        className="shrink-0 w-12 min-w-[48px] max-w-[48px] h-[19px] flex items-center justify-center mt-0.5 px-0.5 py-[1.5px] rounded-[2px] bg-[#1a1a1a] border border-[#3d3830] shadow-xs cursor-pointer select-none overflow-hidden hover:border-[#5a5245] hover:bg-[#242424] active:scale-95 transition-all text-[#f4ecd8]"
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                commitInput();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            onBlur={() => {
              commitInput();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              resetToUnity(e);
              setIsEditing(false);
            }}
            className="w-full h-full text-center bg-transparent border-none outline-none font-mono tabular-nums font-bold text-[10px] p-0 m-0 leading-none cursor-text select-all text-[#f4ecd8]"
            style={{ color: '#f4ecd8' }}
          />
        ) : (
          <span
            ref={setTextRef}
            className={`${fontSize || 'text-[10px]'} w-full text-center font-mono tabular-nums font-bold select-none tracking-tight leading-none truncate pointer-events-none text-[#f4ecd8]`}
            style={{ color: '#f4ecd8' }}
          >
            {faderPositionToDbString(value ?? defaultValue ?? UNITY_GAIN_FADER_POSITION)}
          </span>
        )}
      </div>
    </div>
  );
};
