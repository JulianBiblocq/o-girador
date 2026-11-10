import React, { useEffect, useRef } from 'react';
import { masterBusWorkletManager } from '../../../audio/effectsChain';
import { subscribeVuMeter } from '../../controls/vuMeterTicker';
import { useSequencerStore } from '../../../stores/useSequencerStore';

interface StudioRackNeedleVuProps {
  isPlaying: boolean;
  compVuLabel: string;
  duckBarRef?: React.RefObject<HTMLDivElement | null>;
  duckTextRef?: React.RefObject<HTMLSpanElement | null>;
}

const TapeReelSvg: React.FC = () => (
  <svg className="w-16 h-16 text-[var(--cordel-text)]/80 shrink-0" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="32" cy="32" r="28" />
    <circle cx="32" cy="32" r="20" strokeDasharray="4 3" />
    <circle cx="32" cy="32" r="7" />
    <line x1="32" y1="4" x2="32" y2="25" />
    <line x1="8" y1="46" x2="26" y2="35" />
    <line x1="56" y1="46" x2="38" y2="35" />
  </svg>
);

export const StudioRackNeedleVu: React.FC<StudioRackNeedleVuProps> = ({
  isPlaying,
  compVuLabel,
  duckBarRef,
  duckTextRef,
}) => {
  const needleRef = useRef<SVGGElement>(null);
  const grValueTextRef = useRef<SVGTextElement>(null);
  const smoothGrRef = useRef<number>(0);
  const isEcoMode = useSequencerStore(st => st.isEcoMode);

  useEffect(() => {
    const resetNeedle = () => {
      smoothGrRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = 'rotate(38deg)';
      if (grValueTextRef.current) grValueTextRef.current.textContent = '0.0 dB';
      if (duckBarRef?.current) duckBarRef.current.style.transform = 'scaleX(0)';
      if (duckTextRef?.current) duckTextRef.current.textContent = '0.0 dB';
    };

    if (!isPlaying || isEcoMode) {
      resetNeedle();
      return;
    }

    const updateNeedle = () => {
      const tel = masterBusWorkletManager?.latestTelemetry;
      const rawGr = tel && Number.isFinite(tel.grDb) ? Math.min(12, Math.abs(tel.grDb)) : 0;
      const nextGr = rawGr > smoothGrRef.current ? rawGr : smoothGrRef.current * 0.86 + rawGr * 0.14;
      smoothGrRef.current = nextGr < 0.05 ? 0 : nextGr;

      // Angle : 0 dB à droite (+38 deg) -> -12 dB à gauche (-38 deg)
      const angleDeg = 38 - (smoothGrRef.current / 12) * 76;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`;
      if (grValueTextRef.current) {
        grValueTextRef.current.textContent = smoothGrRef.current > 0.05 ? `-${smoothGrRef.current.toFixed(1)} dB` : '0.0 dB';
      }

      const rawDuck = tel && Number.isFinite(tel.duckDb) ? Math.min(4, Math.abs(tel.duckDb)) : 0;
      if (duckBarRef?.current) duckBarRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, rawDuck / 4))})`;
      if (duckTextRef?.current) duckTextRef.current.textContent = rawDuck > 0.05 ? `-${rawDuck.toFixed(1)} dB` : '0.0 dB';
    };

    const unsub = subscribeVuMeter(updateNeedle, resetNeedle);
    return () => { unsub(); resetNeedle(); };
  }, [isPlaying, isEcoMode, duckBarRef, duckTextRef]);

  return (
    <div className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2.5 rounded-none flex items-center justify-around gap-3">
      <TapeReelSvg />

      {/* Cadran analogique ambré à aiguille GPU */}
      <div className="flex-1 max-w-[230px] bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] p-1.5 rounded-none">
        <svg viewBox="0 0 180 78" className="w-full h-[68px]">
          <path d="M 24 62 A 68 68 0 0 1 156 62" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="24" y="48" fontSize="8" fill="currentColor" className="font-mono font-bold">-12</text>
          <text x="54" y="28" fontSize="8" fill="currentColor" className="font-mono font-bold">-6</text>
          <text x="86" y="20" fontSize="8" fill="currentColor" className="font-mono font-bold">-3</text>
          <text x="150" y="48" textAnchor="end" fontSize="8" fill="currentColor" className="font-mono font-bold">0</text>
          <text x="90" y="44" textAnchor="middle" fontSize="7.5" fill="currentColor" className="font-cactus font-black">{compVuLabel}</text>
          <text ref={grValueTextRef} x="90" y="56" textAnchor="middle" fontSize="9.5" fill="currentColor" className="font-mono font-bold">0.0 dB</text>
          <g
            ref={needleRef}
            style={{ transformOrigin: '90px 68px', transform: 'rotate(38deg)', willChange: 'transform' }}
          >
            <line x1="90" y1="68" x2="90" y2="14" stroke="var(--cordel-wood)" strokeWidth="2.4" />
            <circle cx="90" cy="68" r="4.5" fill="currentColor" />
          </g>
        </svg>
      </div>

      <TapeReelSvg />
    </div>
  );
};
