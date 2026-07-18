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
            gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
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
              let sum = 0;
              for (let i = 0; i < data.length; i++) {
                sum += data[i] * data[i];
              }
              const rms = Math.sqrt(sum / data.length);
              db = rms > 0.00001 ? 20 * Math.log10(rms) : -80;
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
            currentScale = currentScale * 0.90 + targetScale * 0.10; // smooth decay
          }
          lastLevelRef.current = currentScale;
          
          if (gaugeRef.current) {
            gaugeRef.current.style.transform = orientation === 'vertical' 
              ? `scaleY(${currentScale})` 
              : `scaleX(${currentScale})`;
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
            gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
          }
        }
      }
    });

    if (!isActive || !isPlaying) {
      lastLevelRef.current = 0;
      if (gaugeRef.current) {
        gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
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
      <div
        ref={gaugeRef}
        className="absolute bottom-0 left-0 bg-[var(--cordel-border)] w-full h-full"
        style={{
          transform: orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)',
          transformOrigin: orientation === 'vertical' ? 'bottom' : 'left',
          transition: 'none',
        }}
      />
    </div>
  );
};
