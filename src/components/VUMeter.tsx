import React, { useEffect, useRef } from 'react';
import { meters, busMeters } from '../hooks/useAudioSync';
import {
  readMeterRmsAndPeakDb, createPeakHoldState, advanceDualMeterBallistics, applyVuLedDomState,
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
  meterGainOffsetDb?: number;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  trackId, instrumentId: _instrumentId, busId, isPlaying,
  orientation = 'vertical', className = '', isActive = true, meterGainOffsetDb = 0,
}) => {
  const rmsVeilRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const peakCarrierRef = useRef<HTMLDivElement>(null);
  const clipLedRef = useRef<HTMLDivElement>(null);
  const peakHoldRef = useRef(createPeakHoldState());

  const clearClipLed = (e: React.MouseEvent) => {
    e.stopPropagation();
    peakHoldRef.current.clipUntilMs = 0;
    peakHoldRef.current.warnUntilMs = 0;
    applyVuLedDomState(clipLedRef.current, 'off');
  };

  useEffect(() => {
    const isVert = orientation === 'vertical';
    const resetGauge = () => {
      peakHoldRef.current = createPeakHoldState();
      if (rmsVeilRef.current) rmsVeilRef.current.style.transform = isVert ? 'scaleY(1)' : 'scaleX(1)';
      if (gaugeRef.current) gaugeRef.current.style.transform = isVert ? 'scaleY(1)' : 'scaleX(1)';
      if (peakCarrierRef.current) {
        peakCarrierRef.current.style.opacity = '0';
        peakCarrierRef.current.style.transform = isVert ? 'translate3d(0, 100%, 0)' : 'translate3d(0%, 0, 0)';
      }
      applyVuLedDomState(clipLedRef.current, 'off');
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

      const { rmsDb, peakDb, isClip } = readMeterRmsAndPeakDb(meterNode);
      const { rmsBarNorm, effectivePeakNorm, holdNorm, ledState } = advanceDualMeterBallistics(
        peakHoldRef.current, rmsDb, peakDb, isClip, performance.now(), meterGainOffsetDb
      );

      if (rmsVeilRef.current) {
        const rmsMask = Math.max(0, Math.min(1, 1 - rmsBarNorm));
        rmsVeilRef.current.style.transform = isVert ? `scaleY(${rmsMask})` : `scaleX(${rmsMask})`;
      }
      if (gaugeRef.current) {
        const peakMask = Math.max(0, Math.min(1, 1 - effectivePeakNorm));
        gaugeRef.current.style.transform = isVert ? `scaleY(${peakMask})` : `scaleX(${peakMask})`;
      }

      if (peakCarrierRef.current) {
        if (holdNorm > 0.02) {
          peakCarrierRef.current.style.opacity = '0.98';
          peakCarrierRef.current.style.transform =
            isVert ? `translate3d(0, ${(1 - holdNorm) * 100}%, 0)` : `translate3d(${holdNorm * 100}%, 0, 0)`;
        } else {
          peakCarrierRef.current.style.opacity = '0';
        }
      }
      applyVuLedDomState(clipLedRef.current, ledState);
    };

    const unsubscribeTicker = subscribeVuMeter(updateMeter, resetGauge);
    return () => { unsubscribeTicker(); resetGauge(); };
  }, [trackId, busId, orientation, isActive, isPlaying, meterGainOffsetDb]);

  const isVert = orientation === 'vertical';
  return (
    <div className={`relative flex ${isVert ? 'flex-col items-center' : 'flex-row-reverse items-center'} select-none ${className}`}>
      {/* Voyant Peak/Clip O détaché au-dessus de la colonne H */}
      <div
        ref={clipLedRef}
        onClick={clearClipLed}
        title="Voyant Peak (-3 dB Ambre) / Clip (-0.1 dB Terracotta) - Cliquer pour acquitter"
        className={`${isVert ? 'w-[11px] h-[8px] mb-1' : 'h-[11px] w-[8px] ml-1'} rounded-[1.5px] border border-[var(--cordel-border-strong)] shrink-0 cursor-pointer z-20 transition-colors`}
        style={{ backgroundColor: 'var(--vu-led-off-bg)', opacity: 0.85 }}
      />
      {/* Colonne H */}
      <div className={`relative flex-1 ${isVert ? 'w-[8px] min-h-0' : 'h-[8px] min-w-0'} overflow-hidden rounded-[1px] border border-[var(--cordel-border)] bg-[var(--vu-track-bg)]`}>
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ background: isVert ? STUDIO_VU_GRADIENT_VERTICAL : STUDIO_VU_GRADIENT_HORIZONTAL }}
        />
        <div
          ref={rmsVeilRef}
          className="absolute inset-0 bg-[var(--vu-track-bg)] opacity-[0.42] w-full h-full pointer-events-none will-change-transform"
          style={{ transform: isVert ? 'scaleY(1)' : 'scaleX(1)', transformOrigin: isVert ? 'top' : 'right', transition: 'none' }}
        />
        <div
          ref={gaugeRef}
          className="absolute inset-0 bg-[var(--vu-track-bg)] w-full h-full pointer-events-none will-change-transform"
          style={{ transform: isVert ? 'scaleY(1)' : 'scaleX(1)', transformOrigin: isVert ? 'top' : 'right', transition: 'none' }}
        />
        <div
          ref={peakCarrierRef}
          className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
          style={{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }}
        >
          <div className={isVert ? 'w-full h-[2.5px] bg-[var(--vu-peak-tick-color)] shadow-[0_0_2px_rgba(0,0,0,0.9)]' : 'h-full w-[2.5px] bg-[var(--vu-peak-tick-color)] shadow-[0_0_2px_rgba(0,0,0,0.9)]'} />
        </div>
      </div>
    </div>
  );
};
