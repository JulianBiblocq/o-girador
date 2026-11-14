/**
 * BusDynamicsTransferCurveSvg.tsx — Courbe de Transfert Statique + Bouclier Sidechain HPF (< 110 lignes).
 * 100 % SVG déclaratif mémorisé (`0 %` CPU pendant la lecture audio, recalculé uniquement si un réglage change).
 */
import React, { useMemo } from 'react';
import type { BusCompressorSettings } from '../../../audio/effects/busCompressorTypes';
import type { BusDynamicsModalStrings } from './busDynamicsModalI18n';

interface BusDynamicsTransferCurveSvgProps {
  settings: BusCompressorSettings;
  s: BusDynamicsModalStrings;
}

const MIN_DB = -48;

function computeStaticOutputDb(inDb: number, s: BusCompressorSettings): number {
  const { thresholdDb, ratio, kneeDb, makeupDb, mixPct } = s;
  const slope = 1 - 1 / Math.max(1, ratio);
  const halfKnee = Math.max(0, kneeDb) * 0.5;
  const delta = inDb - thresholdDb;
  let grDb = 0;
  if (halfKnee > 0 && delta > -halfKnee && delta < halfKnee) {
    const x = delta + halfKnee;
    grDb = slope * ((x * x) / (2 * kneeDb));
  } else if (delta >= halfKnee) {
    grDb = slope * delta;
  }
  const wetGain = Math.pow(10, (-grDb + makeupDb) / 20);
  const wet = Math.max(0, Math.min(1, mixPct / 100));
  const effGain = (1 - wet) + wet * wetGain;
  return Math.max(MIN_DB, Math.min(3, inDb + 20 * Math.log10(Math.max(1e-4, effGain))));
}

export const BusDynamicsTransferCurveSvg: React.FC<BusDynamicsTransferCurveSvgProps> = ({ settings, s }) => {
  const { thresholdDb, ratio, kneeDb, sidechainHpfHz, makeupDb, mixPct, enabled } = settings;

  const { curvePath, threshX, shieldWidth } = useMemo(() => {
    const x0 = 14; const y0 = 10; const w = 112; const h = 62;
    const toX = (db: number) => x0 + ((db - MIN_DB) / -MIN_DB) * w;
    const toY = (db: number) => y0 + h - ((db - MIN_DB) / -MIN_DB) * h;
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const inDb = MIN_DB + (i / 24) * -MIN_DB;
      const outDb = enabled ? computeStaticOutputDb(inDb, settings) : inDb;
      pts.push(`${i === 0 ? 'M' : 'L'} ${toX(inDb).toFixed(1)} ${toY(outDb).toFixed(1)}`);
    }
    const scNorm = Math.max(0, Math.min(1, (sidechainHpfHz - 20) / (250 - 20)));
    return {
      curvePath: pts.join(' '),
      threshX: toX(Math.max(MIN_DB, Math.min(0, thresholdDb))),
      shieldWidth: 14 + scNorm * 82,
    };
  }, [thresholdDb, ratio, kneeDb, sidechainHpfHz, makeupDb, mixPct, enabled]);

  return (
    <div className="flex-1 min-w-[230px] flex flex-col gap-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] p-2 rounded-none">
      <div className="flex items-center justify-between text-[9px] font-cactus font-black uppercase tracking-wider">
        <span>{s.transferTitle}</span>
        <span className="font-mono">{`${ratio.toFixed(1)}:1 · SC ${Math.round(sidechainHpfHz)} Hz`}</span>
      </div>
      <svg viewBox="0 0 256 80" className="w-full h-[68px]" aria-label={s.transferTitle}>
        {/* Boîte Courbe de Transfert (-48..0 dB) */}
        <rect x="14" y="10" width="112" height="62" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <line x1="14" y1="72" x2="126" y2="10" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
        <line x1={threshX} y1="10" x2={threshX} y2="72" stroke="var(--cordel-wood)" strokeWidth="1.1" strokeDasharray="2 2" />
        <path d={curvePath} fill="none" stroke="var(--cordel-wood)" strokeWidth="2.3" strokeLinecap="round" />
        <text x="16" y="20" fontSize="7" fill="currentColor" className="font-mono font-bold">{`${thresholdDb.toFixed(1)}dB`}</text>
        <text x="124" y="70" textAnchor="end" fontSize="6.8" fill="currentColor" className="font-mono">0 dB</text>

        {/* Bouclier Sidechain HPF (zone sous-grave protégée < sidechainHpfHz) */}
        <rect x="142" y="10" width="102" height="62" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="142" y="10" width={shieldWidth} height="62" fill="var(--cordel-wood)" opacity="0.18" />
        <path
          d={`M 142 64 L ${(142 + Math.max(4, shieldWidth - 10)).toFixed(1)} 64 Q ${(142 + shieldWidth).toFixed(1)} 64 ${(142 + shieldWidth + 6).toFixed(1)} 26 L 244 26`}
          fill="none" stroke="currentColor" strokeWidth="1.9"
        />
        <line x1={142 + shieldWidth} y1="10" x2={142 + shieldWidth} y2="72" stroke="var(--cordel-wood)" strokeWidth="1.3" />
        <text x="146" y="21" fontSize="6.8" fill="currentColor" className="font-cactus font-black">{s.scShieldLabel}</text>
        <text x="146" y="32" fontSize="7.8" fill="var(--cordel-wood)" className="font-mono font-bold">{`< ${Math.round(sidechainHpfHz)} Hz`}</text>
        <text x="145" y="70" fontSize="6.5" fill="currentColor" className="font-mono">20Hz</text>
        <text x="241" y="70" textAnchor="end" fontSize="6.5" fill="currentColor" className="font-mono">250Hz</text>
      </svg>
    </div>
  );
};

