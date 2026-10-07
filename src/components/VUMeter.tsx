import React, { useEffect, useRef } from 'react';
import { meters, busMeters } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';

interface VUMeterProps {
  trackId?: number;
  instrumentId?: string;
  busId?: string;
  isPlaying: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  isActive?: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  trackId,
  instrumentId,
  busId,
  isPlaying,
  orientation = 'vertical',
  className = '',
  isActive = true,
}) => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const lastLevelRef = useRef<number>(0);
  const isEcoRef = useRef<boolean>(useSequencerStore.getState().isEcoMode);

  useEffect(() => {
    isEcoRef.current = useSequencerStore.getState().isEcoMode;
    let animationFrameId: number | null = null;

      const updateMeter = () => {
        if ((window as any).oGiradorDetailEditorOpen) {
          animationFrameId = requestAnimationFrame(updateMeter);
          return;
        }
        if (isEcoRef.current) {
          lastLevelRef.current = 0;
          if (gaugeRef.current) {
            gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)';
          }
          animationFrameId = null;
          return; // Break the rAF loop when eco mode is active
        }

        const meterNode = (busId && busMeters ? busMeters[busId] : undefined) || 
                          (meters && trackId !== undefined ? meters[trackId] : undefined) ||
                          (busMeters && trackId !== undefined ? busMeters[trackId] : undefined);

        if (meterNode) {
        try {
          let db = -80;
          if (typeof (meterNode as any).getValue === 'function') {
            const data = (meterNode as any).getValue();
            if (data instanceof Float32Array) {
              let peak = 0;
              for (let i = 0; i < data.length; i++) {
                const abs = Math.abs(data[i]);
                if (abs > peak) peak = abs;
              }
              db = peak > 0.00001 ? 20 * Math.log10(peak) : -80;
            } else if (Array.isArray(data) && data[0] instanceof Float32Array) {
              let peak = 0;
              for (let c = 0; c < data.length; c++) {
                const channelData = data[c];
                for (let i = 0; i < channelData.length; i++) {
                  const abs = Math.abs(channelData[i]);
                  if (abs > peak) peak = abs;
                }
              }
              db = peak > 0.00001 ? 20 * Math.log10(peak) : -80;
            } else if (typeof data === 'number') {
              db = data;
            }
          }

          // Clamp dB value between -80 (silence) and 6 (peak level)
          const clampedDb = Math.max(-80, Math.min(6, db));
          // Map decibels to scale percentage (using linear db mapping over 86 dB range)
          const percentage = Math.max(0, Math.min(100, ((clampedDb + 80) / 86) * 100));
          const targetScale = percentage / 100;

          let currentScale = lastLevelRef.current;
          if (targetScale > currentScale) {
            currentScale = targetScale; // instant attack
          } else {
            // Slower, smoother decay
            currentScale = currentScale * 0.97 + targetScale * 0.03; 
          }
          lastLevelRef.current = currentScale;
          
          if (gaugeRef.current) {
            const maskScale = Math.max(0, Math.min(1, 1 - currentScale));
            gaugeRef.current.style.transform = orientation === 'vertical' 
              ? `scaleY(${maskScale})` 
              : `scaleX(${maskScale})`;
          }
        } catch (e) {
          console.error("Error reading track meter value:", e);
        }
      }

      animationFrameId = requestAnimationFrame(updateMeter);
    };

    const unsubscribe = useSequencerStore.subscribe((state) => {
      const nextEco = state.isEcoMode;
      if (isEcoRef.current !== nextEco) {
        isEcoRef.current = nextEco;
        if (!nextEco) {
          if (animationFrameId === null && isActive && isPlaying) {
            updateMeter();
          }
        } else {
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
          lastLevelRef.current = 0;
          if (gaugeRef.current) {
            gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)';
          }
        }
      }
    });

    if (!isActive || !isPlaying) {
      lastLevelRef.current = 0;
      if (gaugeRef.current) {
        gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)';
      }
      return () => {
        unsubscribe();
      };
    }

    if (!isEcoRef.current) {
      updateMeter();
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      unsubscribe();
    };
  }, [trackId, instrumentId, busId, orientation, isActive, isPlaying]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 1. Colonne avec dégradé vertical fixe Cordel (signal faible vert d'eau -> énergie ocre -> crête rouge terracotta) */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background: orientation === 'vertical'
            ? 'linear-gradient(to top, #3b8c82 0%, #3b8c82 65%, #d99b26 80%, #c25e38 95%)'
            : 'linear-gradient(to right, #3b8c82 0%, #3b8c82 65%, #d99b26 80%, #c25e38 95%)',
        }}
      />
      {/* 2. Masque opaque descendant piloté en GPU (scaleY) de 1 (masqué) à 0 (dévoilé) */}
      <div
        ref={gaugeRef}
        className="absolute inset-0 bg-[var(--cordel-bg)] w-full h-full pointer-events-none"
        style={{
          transform: orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)',
          transformOrigin: orientation === 'vertical' ? 'top' : 'right',
          transition: 'none',
        }}
      />
    </div>
  );
};
