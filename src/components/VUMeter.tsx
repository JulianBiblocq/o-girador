import React, { useEffect, useRef } from 'react';
import { meters, busMeters } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';
import { readMeterDb, computeNextMeterScale } from './controls/vuMeterMath';
import { subscribeVuMeter } from './controls/vuMeterTicker';

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

  useEffect(() => {
    const resetGauge = () => {
      lastLevelRef.current = 0;
      if (gaugeRef.current) {
        gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)';
      }
    };

    if (!isActive || !isPlaying) {
      resetGauge();
      return;
    }

    const updateMeter = () => {
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
    };

    const unsubscribeTicker = subscribeVuMeter(updateMeter);

    const unsubscribeStore = useSequencerStore.subscribe((state) => {
      if (state.isEcoMode) resetGauge();
    });

    return () => {
      unsubscribeTicker();
      unsubscribeStore();
      resetGauge();
    };
  }, [trackId, busId, orientation, isActive, isPlaying]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background: orientation === 'vertical'
            ? 'linear-gradient(to top, var(--vu-level-nominal) 0%, var(--vu-level-nominal) 65%, var(--vu-level-warn) 80%, var(--vu-level-clip) 95%)'
            : 'linear-gradient(to right, var(--vu-level-nominal) 0%, var(--vu-level-nominal) 65%, var(--vu-level-warn) 80%, var(--vu-level-clip) 95%)',
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
