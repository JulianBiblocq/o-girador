/**
 * BusDynamicsMetersPanel.tsx — Cadran Analogique `GR` à Aiguille 60 FPS GPU + Courbe Statique (< 105 lignes).
 * Commandements 1 & 3 : `0` `useState` dans la boucle `subscribeVuMeter`, rotation GPU `transform: rotate(...)` sur `<g>`.
 */
import React, { useEffect, useRef } from 'react';
import type { BusCompressorSettings } from '../../../audio/effects/busCompressorTypes';
import { getBusGrDb } from '../../../audio/worklet/bus-compressor/BusCompressorWorkletManager';
import { subscribeVuMeter } from '../../controls/vuMeterTicker';
import { BusDynamicsTransferCurveSvg } from './BusDynamicsTransferCurveSvg';
import type { BusDynamicsModalStrings } from './busDynamicsModalI18n';

interface BusDynamicsMetersPanelProps {
  trackId: number;
  isPlaying: boolean;
  disableFx: boolean;
  settings: BusCompressorSettings;
  s: BusDynamicsModalStrings;
}

const FULL_SCALE_GR_DB = 12;
const RELEASE_SMOOTH = 0.86;

export const BusDynamicsMetersPanel: React.FC<BusDynamicsMetersPanelProps> = ({
  trackId, isPlaying, disableFx, settings, s,
}) => {
  const needleRef = useRef<SVGGElement>(null);
  const grTextRef = useRef<SVGTextElement>(null);
  const smoothGrRef = useRef<number>(0);
  const grActive = isPlaying && settings.enabled && !disableFx;

  useEffect(() => {
    const resetNeedle = () => {
      smoothGrRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = 'rotate(38deg)';
      if (grTextRef.current) grTextRef.current.textContent = '0.0 dB';
    };

    if (!grActive) {
      resetNeedle();
      return;
    }

    const onTick = () => {
      const raw = Math.min(FULL_SCALE_GR_DB, Math.max(0, getBusGrDb(trackId)));
      const next = raw >= smoothGrRef.current ? raw : smoothGrRef.current * RELEASE_SMOOTH + raw * (1 - RELEASE_SMOOTH);
      smoothGrRef.current = next < 0.05 ? 0 : next;
      const angleDeg = 38 - (smoothGrRef.current / FULL_SCALE_GR_DB) * 76;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`;
      if (grTextRef.current) {
        grTextRef.current.textContent = smoothGrRef.current > 0.05 ? `-${smoothGrRef.current.toFixed(1)} dB` : '0.0 dB';
      }
    };

    const unsub = subscribeVuMeter(onTick, resetNeedle);
    return () => { unsub(); resetNeedle(); };
  }, [trackId, grActive]);

  return (
    <div className="flex flex-col md:flex-row items-stretch gap-2.5 w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2.5 rounded-none select-none">
      {/* Cadran Analogique GR (0 à -12 dB) */}
      <div className="w-full md:w-[235px] shrink-0 flex flex-col gap-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] p-2 rounded-none">
        <span className="text-[9px] font-cactus font-black uppercase tracking-wider">{s.grMeterTitle}</span>
        <svg viewBox="0 0 180 78" className="w-full h-[68px]" aria-label={s.grMeterTitle}>
          <path d="M 24 62 A 68 68 0 0 1 156 62" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="22" y="48" fontSize="8" fill="currentColor" className="font-mono font-bold">-12</text>
          <text x="41" y="34" fontSize="7.5" fill="currentColor" className="font-mono font-bold">-9</text>
          <text x="64" y="24" fontSize="8" fill="currentColor" className="font-mono font-bold">-6</text>
          <text x="95" y="21" fontSize="8" fill="currentColor" className="font-mono font-bold">-3</text>
          <text x="154" y="48" textAnchor="end" fontSize="8" fill="currentColor" className="font-mono font-bold">0</text>
          <text x="90" y="43" textAnchor="middle" fontSize="7.5" fill="currentColor" className="font-cactus font-black">{s.grDialLabel}</text>
          <text ref={grTextRef} x="90" y="56" textAnchor="middle" fontSize="9.5" fill="currentColor" className="font-mono font-bold">0.0 dB</text>
          <g
            ref={needleRef}
            data-testid="bus-dynamics-gr-needle"
            style={{ transformOrigin: '90px 68px', transform: 'rotate(38deg)', willChange: 'transform' }}
          >
            <line x1="90" y1="68" x2="90" y2="14" stroke="var(--cordel-wood)" strokeWidth="2.4" />
            <circle cx="90" cy="68" r="4.5" fill="currentColor" />
          </g>
        </svg>
      </div>

      {/* Courbe de Transfert Statique + Bouclier Sidechain HPF */}
      <BusDynamicsTransferCurveSvg settings={settings} s={s} />
    </div>
  );
};

