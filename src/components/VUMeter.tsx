import React, { useEffect, useRef } from 'react';
import { meters, busMeters } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { readMeterDb, computeNextMeterScale } from './controls/vuMeterMath';

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
  instrumentId: _instrumentId,
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
        return;
      }

      const meterNode = (busId && busMeters ? busMeters[busId] : undefined) || 
                        (meters && trackId !== undefined ? meters[trackId] : undefined) ||
                        (busMeters && trackId !== undefined ? busMeters[trackId] : undefined);

      if (meterNode) {
        const db = readMeterDb(meterNode);
        const currentScale = computeNextMeterScale(lastLevelRef.current, db);
        lastLevelRef.current = currentScale;
        
        if (gaugeRef.current) {
          const maskScale = Math.max(0, Math.min(1, 1 - currentScale));
          gaugeRef.current.style.transform = orientation === 'vertical' 
            ? `scaleY(${maskScale})` 
            : `scaleX(${maskScale})`;
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
      return () => unsubscribe();
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
  }, [trackId, busId, orientation, isActive, isPlaying]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background: orientation === 'vertical'
            ? 'linear-gradient(to top, #3b8c82 0%, #3b8c82 65%, #d99b26 80%, #c25e38 95%)'
            : 'linear-gradient(to right, #3b8c82 0%, #3b8c82 65%, #d99b26 80%, #c25e38 95%)',
        }}
      />
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
