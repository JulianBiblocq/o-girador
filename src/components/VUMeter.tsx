import React, { useEffect, useRef } from 'react';
import { meters } from '../hooks/useAudioSync';

interface VUMeterProps {
  instrumentId: string;
  isPlaying: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  instrumentId,
  isPlaying,
  orientation = 'vertical',
  className = '',
}) => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    let animationFrameId: number;
    const meterNode = meters && instrumentId ? meters[instrumentId] : undefined;

    const updateMeter = () => {
      if ((window as any).oGiradorDetailEditorOpen) {
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }
      // If eco-mode is globally activated, we suspend animation to save CPU
      const isEco = typeof window !== 'undefined' && (window as any).oGiradorEcoMode;
      if (isEco) {
        if (gaugeRef.current) {
          gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
        }
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }

      if (!isPlayingRef.current) {
        if (gaugeRef.current) {
          gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(0)' : 'scaleX(0)';
        }
        // Keep running in low-frequency check or just yield to avoid continuous updates
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }

      if (meterNode) {
        try {
          const db = meterNode.getValue() as number;
          // Clamp dB value between -80 (silence) and 6 (peak level)
          const clampedDb = Math.max(-80, Math.min(6, db));
          // Map decibels to scale percentage (using linear db mapping over 86 dB range)
          const percentage = Math.max(0, Math.min(100, ((clampedDb + 80) / 86) * 100));
          
          if (gaugeRef.current) {
            const scale = percentage / 100;
            gaugeRef.current.style.transform = orientation === 'vertical' 
              ? `scaleY(${scale})` 
              : `scaleX(${scale})`;
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
  }, [instrumentId, orientation]);

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
