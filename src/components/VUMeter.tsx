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

  useEffect(() => {
    if (!isActive || !isPlaying) {
      lastLevelRef.current = 0;
      if (gaugeRef.current) {
        gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
      }
      return;
    }

    let animationFrameId: number;

    const updateMeter = () => {
      if ((window as any).oGiradorDetailEditorOpen) {
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }
      const isEco = useSequencerStore.getState().isEcoMode;
      if (isEco) {
        lastLevelRef.current = 0;
        if (gaugeRef.current) {
          gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
        }
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }

      const meterNode = busId && busMeters ? busMeters[busId] : (meters && trackId !== undefined ? meters[trackId] : undefined);
      if (meterNode) {
        try {
          const db = meterNode.getValue() as number;
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

    updateMeter();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trackId, instrumentId, orientation, isActive, isPlaying]);

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
