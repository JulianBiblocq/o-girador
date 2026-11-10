import React, { useEffect, useRef } from 'react';
import { meters, busMeters } from '../hooks/useAudioSync';
import {
  readMeterRmsAndPeakDb, createPeakHoldState, advancePeakBallistics,
  STUDIO_VU_GRADIENT_VERTICAL, STUDIO_VU_GRADIENT_HORIZONTAL,
} from './controls/vuMeterMath';
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
  trackId, instrumentId: _instrumentId, busId, isPlaying,
  orientation = 'vertical', className = '', isActive = true,
}) => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const peakCarrierRef = useRef<HTMLDivElement>(null);
  const clipLedRef = useRef<HTMLDivElement>(null);
  const lastLevelRef = useRef<number>(0);
  const peakHoldRef = useRef(createPeakHoldState());

  const clearClipLed = (e: React.MouseEvent) => {
    e.stopPropagation();
    peakHoldRef.current.clipUntilMs = 0;
    if (clipLedRef.current) clipLedRef.current.style.opacity = '0.2';
  };

  useEffect(() => {
    const resetGauge = () => {
      lastLevelRef.current = 0;
      peakHoldRef.current = createPeakHoldState();
      if (gaugeRef.current) gaugeRef.current.style.transform = orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)';
      if (peakCarrierRef.current) {
        peakCarrierRef.current.style.opacity = '0';
        peakCarrierRef.current.style.transform = orientation === 'vertical' ? 'translate3d(0, 100%, 0)' : 'translate3d(0%, 0, 0)';
      }
      if (clipLedRef.current) clipLedRef.current.style.opacity = '0.2';
    };

    if (!isActive || !isPlaying) {
      resetGauge();
      return;
    }

    const updateMeter = () => {
      const meterNode =
        (busId && busMeters ? busMeters[busId] : undefined) ||
        (meters && trackId !== undefined ? meters[trackId] : undefined) ||
        (busMeters && trackId !== undefined ? busMeters[trackId] : undefined);
      if (!meterNode) return;

      const { peakDb, isClip } = readMeterRmsAndPeakDb(meterNode);
      const { barNorm, holdNorm, isClipHeld } = advancePeakBallistics(
        peakHoldRef.current, peakDb, isClip, performance.now()
      );
      lastLevelRef.current = barNorm;

      if (gaugeRef.current) {
        const maskScale = Math.max(0, Math.min(1, 1 - barNorm));
        gaugeRef.current.style.transform = orientation === 'vertical' ? `scaleY(${maskScale})` : `scaleX(${maskScale})`;
      }

      if (peakCarrierRef.current) {
        if (holdNorm > 0.02) {
          peakCarrierRef.current.style.opacity = '0.95';
          peakCarrierRef.current.style.transform =
            orientation === 'vertical' ? `translate3d(0, ${(1 - holdNorm) * 100}%, 0)` : `translate3d(${holdNorm * 100}%, 0, 0)`;
        } else {
          peakCarrierRef.current.style.opacity = '0';
        }
      }
      if (clipLedRef.current) clipLedRef.current.style.opacity = isClipHeld ? '1' : '0.2';
    };

    const unsubscribeTicker = subscribeVuMeter(updateMeter, resetGauge);
    return () => { unsubscribeTicker(); resetGauge(); };
  }, [trackId, busId, orientation, isActive, isPlaying]);

  return (
    <div className={`relative overflow-hidden flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row-reverse'} ${className}`}>
      <div
        ref={clipLedRef}
        onClick={clearClipLed}
        title="Clip (>= -0.1 dBFS) - Cliquer pour acquitter"
        className={`${orientation === 'vertical' ? 'w-full h-[3.5px] border-b' : 'h-full w-[3.5px] border-l'} shrink-0 border-[var(--cordel-border)]/40 cursor-pointer z-20 transition-opacity`}
        style={{ backgroundColor: 'var(--vu-level-clip)', opacity: 0.2 }}
      />
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[var(--vu-track-bg)]">
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            background: orientation === 'vertical' ? STUDIO_VU_GRADIENT_VERTICAL : STUDIO_VU_GRADIENT_HORIZONTAL,
          }}
        />
        <div
          ref={gaugeRef}
          className="absolute inset-0 bg-[var(--vu-track-bg)] w-full h-full pointer-events-none will-change-transform"
          style={{
            transform: orientation === 'vertical' ? 'scaleY(1)' : 'scaleX(1)',
            transformOrigin: orientation === 'vertical' ? 'top' : 'right',
            transition: 'none',
          }}
        />
        <div
          ref={peakCarrierRef}
          className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
          style={{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }}
        >
          <div className={orientation === 'vertical' ? 'w-full h-[2px] bg-[var(--cordel-parchment-bg)] shadow-[0_0_2px_rgba(0,0,0,0.9)]' : 'h-full w-[2px] bg-[var(--cordel-parchment-bg)] shadow-[0_0_2px_rgba(0,0,0,0.9)]'} />
        </div>
      </div>
    </div>
  );
};
