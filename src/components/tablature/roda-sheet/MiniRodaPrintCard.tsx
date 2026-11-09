import React from 'react';
import { getVisualStrokeSymbol } from '../../../data';
import { formatStrokeSymbol } from '../../circle-sequencer/percussionSatelliteHelpers';
import { RodaSheetMeasureItem, RodaSheetTrackInfo } from './rodaSheetTypes';

interface MiniRodaPrintCardProps {
  item: RodaSheetMeasureItem;
  tracks: RodaSheetTrackInfo[];
  isLeftHanded?: boolean;
  compact?: boolean;
}

function buildGougePointsAttr(cx: number, cy: number, r: number, seed: number): string {
  const facets = 11, pts: string[] = [];
  for (let i = 0; i < facets; i++) {
    const a = (i / facets) * Math.PI * 2;
    const jitter = 1 + Math.sin(seed * 1.7 + i * 2.39) * 0.055;
    pts.push(`${(cx + Math.cos(a) * r * jitter).toFixed(1)},${(cy + Math.sin(a) * r * jitter).toFixed(1)}`);
  }
  return pts.join(' ');
}

export const MiniRodaPrintCard: React.FC<MiniRodaPrintCardProps> = ({
  item, tracks, isLeftHanded = false, compact = false,
}) => {
  const cx = 110, cy = 110, outerR = 94, innerR = 32;
  const nTracks = Math.max(1, tracks.length);
  const radialSpan = outerR - innerR;
  const stepCount = item.stepCount || 16;
  const beatsCount = item.timeSig === '2/4' || item.timeSig === '6/8' ? 2 : item.timeSig === '3/4' ? 3 : 4;

  const getTrackRadius = (idx: number): number => {
    if (nTracks === 1) return innerR + radialSpan * 0.56;
    const pad = radialSpan / (nTracks + 0.5);
    return outerR - pad * (idx + 0.75);
  };

  return (
    <div
      className="bg-white text-[#1a1a1a] border-[1.5px] border-[#1a1a1a] flex flex-col items-center justify-center p-1 select-none"
      style={{ backgroundColor: '#ffffff', pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      <svg viewBox="0 0 220 220" className="w-full h-auto block" style={{ maxHeight: compact ? '54mm' : '60mm', backgroundColor: '#ffffff' }}>
        <circle cx={cx} cy={cy} r={outerR} fill="#ffffff" stroke="#1a1a1a" strokeWidth={1.8} />

        {Array.from({ length: stepCount }).map((_, sIdx) => {
          const angle = -Math.PI / 2 + (sIdx / stepCount) * Math.PI * 2;
          const isBeat = (sIdx * beatsCount) % stepCount === 0;
          return (
            <line
              key={`ray-${sIdx}`}
              x1={cx + Math.cos(angle) * innerR} y1={cy + Math.sin(angle) * innerR}
              x2={cx + Math.cos(angle) * outerR} y2={cy + Math.sin(angle) * outerR}
              stroke={isBeat ? '#a8a29e' : '#e7e5e4'} strokeWidth={isBeat ? 0.95 : 0.6}
              strokeDasharray={isBeat ? undefined : '2,2'}
            />
          );
        })}

        {tracks.map((tInfo, tIdx) => {
          const r = getTrackRadius(tIdx);
          return (
            <g key={`orbit-${tInfo.track.id}`}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#d6d3d1" strokeWidth={0.8} />
              {Array.from({ length: stepCount }).map((_, sIdx) => {
                const a = -Math.PI / 2 + (sIdx / stepCount) * Math.PI * 2;
                return <circle key={sIdx} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={1.1} fill="#c7c2be" />;
              })}
            </g>
          );
        })}

        {Array.from({ length: beatsCount }).map((_, bIdx) => {
          const angle = -Math.PI / 2 + (bIdx / beatsCount) * Math.PI * 2;
          const bx = cx + Math.cos(angle) * (outerR + 9.5), by = cy + Math.sin(angle) * (outerR + 9.5);
          return (
            <g key={`beat-${bIdx}`}>
              <circle cx={bx} cy={by} r={6.5} fill="#ffffff" stroke="#1a1a1a" strokeWidth={1.1} />
              <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fill="#1a1a1a" fontSize={7.8} fontWeight={900} fontFamily="sans-serif">{bIdx + 1}</text>
            </g>
          );
        })}

        {tracks.map((tInfo, tIdx) => {
          const r = getTrackRadius(tIdx);
          const steps = item.stepsByTrackId[tInfo.track.id] || [];
          const arcDist = (2 * Math.PI * r) / stepCount;
          const radialGap = radialSpan / Math.max(1.5, nTracks + 0.5);
          const baseStampR = Math.max(4.4, Math.min(8.2, arcDist * 0.42, radialGap * 0.44));

          return steps.map((rawVal, sIdx) => {
            if (rawVal === 0 || rawVal === '0' || rawVal === '' || rawVal === null || rawVal === undefined) return null;
            const angle = -Math.PI / 2 + (sIdx / stepCount) * Math.PI * 2;
            const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
            const isSplit = Array.isArray(rawVal);
            const rawPrimary = isSplit ? (rawVal[0] !== '0' && rawVal[0] ? rawVal[0] : rawVal[1]) : rawVal;
            const visSym = String(getVisualStrokeSymbol(rawPrimary, isLeftHanded, tInfo.inst.id));
            const isStrong = visSym === visSym.toUpperCase() && visSym !== '-' && visSym !== '0';
            const stampR = isStrong ? baseStampR : baseStampR * 0.88;
            const symText = isSplit
              ? `${formatStrokeSymbol(tInfo.inst.id, String(getVisualStrokeSymbol(rawVal[0], isLeftHanded, tInfo.inst.id)))}${formatStrokeSymbol(tInfo.inst.id, String(getVisualStrokeSymbol(rawVal[1], isLeftHanded, tInfo.inst.id)))}`
              : formatStrokeSymbol(tInfo.inst.id, visSym);
            const polyPts = buildGougePointsAttr(px, py, stampR, tIdx * 31 + sIdx * 7);
            const outerPts = buildGougePointsAttr(px, py, stampR + (isStrong ? 1.5 : 1.0), tIdx * 31 + sIdx * 7);

            return (
              <g key={`step-${tInfo.track.id}-${sIdx}`}>
                <polygon points={outerPts} fill="#ffffff" stroke="#1a1a1a" strokeWidth={0.65} strokeLinejoin="round" />
                <polygon points={polyPts} fill="#ffffff" stroke={tInfo.color} strokeWidth={isStrong ? 2.8 : 1.8} strokeLinejoin="round" />
                <text x={px} y={py + 0.4} textAnchor="middle" dominantBaseline="central" fill="#1a1a1a" fontSize={symText.length > 1 ? stampR * 0.85 : stampR * 1.15} fontWeight={900} fontFamily="Outfit, Inter, sans-serif">
                  {symText}
                </text>
              </g>
            );
          });
        })}

        <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" stroke="#1a1a1a" strokeWidth={1.7} />
        <circle cx={cx} cy={cy} r={innerR - 2.2} fill="none" stroke="#1a1a1a" strokeWidth={0.5} strokeDasharray="2,1.5" />
        <text x={cx} y={item.sectionName ? cy - 6 : (item.multiplierLabel ? cy - 4 : cy)} textAnchor="middle" dominantBaseline="central" fill="#1a1a1a" fontSize={item.label.length > 5 ? 8.8 : 10.2} fontWeight={900} fontFamily="sans-serif">
          {item.label}{item.multiplierLabel ? ` (${item.multiplierLabel})` : ''}
        </text>
        {item.sectionName && (
          <text x={cx} y={cy + 6.5} textAnchor="middle" dominantBaseline="central" fill="#1a1a1a" fontSize={6.8} fontWeight={800} fontFamily="sans-serif">
            {item.sectionName.slice(0, 12).toUpperCase()}
          </text>
        )}
        {item.timeSig !== '4/4' && (
          <text x={cx} y={cy + (item.sectionName ? 14 : 9)} textAnchor="middle" dominantBaseline="central" fill="#57534e" fontSize={6.2} fontWeight={800} fontFamily="monospace">
            [{item.timeSig}]
          </text>
        )}
      </svg>
    </div>
  );
};
