import React from 'react';
import { getVisualStrokeSymbol } from '../../../data';
import { computeRodaStepAngles, getRodaMeasureGeometry } from '../../../utils/rodaTimeSigGeometry';
import { formatStrokeSymbol } from '../../circle-sequencer/percussionSatelliteHelpers';
import { RodaSheetMeasureItem, RodaSheetTrackInfo } from './rodaSheetTypes';

interface MiniRodaPrintCardProps {
  item: RodaSheetMeasureItem;
  tracks: RodaSheetTrackInfo[];
  isLeftHanded?: boolean;
  compact?: boolean;
  onHideCard?: (cardKey: string) => void;
  hideTitle?: string;
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
  item, tracks, isLeftHanded = false, compact = false, onHideCard, hideTitle,
}) => {
  const cx = 110, cy = 110, outerR = 94, innerR = 32;
  const nTracks = Math.max(1, tracks.length), radialSpan = outerR - innerR;
  const geom = getRodaMeasureGeometry(item.timeSig);
  const gridAngles = computeRodaStepAngles(item.timeSig);
  const fullLabel = `${item.label}${item.multiplierLabel ? ` (${item.multiplierLabel})` : ''}`;

  const getTrackRadius = (idx: number): number => {
    if (nTracks === 1) return innerR + radialSpan * 0.56;
    return outerR - (radialSpan / (nTracks + 0.5)) * (idx + 0.75);
  };

  return (
    <div
      className="relative bg-white text-[var(--cordel-paper-ink)] border-[1.5px] border-[var(--cordel-paper-ink)] flex flex-col items-center justify-center p-1 select-none"
      style={{ backgroundColor: 'white', pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      {onHideCard && (
        <button
          type="button" onClick={() => onHideCard(item.key)} title={hideTitle || 'Masquer cette Roda de la planche'}
          className="print:hidden absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-[var(--cordel-paper-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-paper-ink)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-paper-ink)] font-mono font-black text-xs leading-none cursor-pointer z-10 shadow-[1px_1px_0px_var(--cordel-paper-ink)] transition-colors"
        >×</button>
      )}
      {fullLabel.length > 9 && (
        <div className="w-full text-left px-1 pt-0.5 font-mono font-black text-[9px] text-[var(--cordel-paper-ink)] leading-tight pr-6">{fullLabel}</div>
      )}
      <svg viewBox="0 0 220 220" className="w-full h-auto block" style={{ maxHeight: compact ? '54mm' : '60mm', backgroundColor: 'white' }}>
        <circle cx={cx} cy={cy} r={outerR} fill="white" stroke="var(--cordel-paper-ink)" strokeWidth={1.8} />
        {gridAngles.map((angle, sIdx) => {
          const isBeat = sIdx % geom.defaultSubdivisions === 0;
          return (
            <line
              key={`ray-${sIdx}`} x1={cx + Math.cos(angle) * innerR} y1={cy + Math.sin(angle) * innerR}
              x2={cx + Math.cos(angle) * outerR} y2={cy + Math.sin(angle) * outerR}
              stroke="var(--cordel-paper-ink)" strokeOpacity={isBeat ? 0.38 : 0.14}
              strokeWidth={isBeat ? 0.95 : 0.6} strokeDasharray={isBeat ? undefined : '2,2'}
            />
          );
        })}
        {tracks.map((tInfo, tIdx) => {
          const r = getTrackRadius(tIdx);
          const trackAngles = item.stepAnglesByTrackId?.[tInfo.track.id] || gridAngles;
          return (
            <g key={`orbit-${tInfo.track.id}`}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cordel-paper-ink)" strokeOpacity={0.2} strokeWidth={0.8} />
              {trackAngles.map((a, sIdx) => (
                <circle key={sIdx} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={1.1} fill="var(--cordel-paper-ink)" fillOpacity={0.28} />
              ))}
            </g>
          );
        })}
        {geom.beatAngles.map((angle, bIdx) => {
          const bx = cx + Math.cos(angle) * (outerR + 9.5), by = cy + Math.sin(angle) * (outerR + 9.5);
          return (
            <g key={`beat-${bIdx}`}>
              <circle cx={bx} cy={by} r={6.5} fill="white" stroke="var(--cordel-paper-ink)" strokeWidth={1.1} />
              <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fill="var(--cordel-paper-ink)" fontSize={7.8} fontWeight={900} fontFamily="sans-serif">{bIdx + 1}</text>
            </g>
          );
        })}
        {tracks.map((tInfo, tIdx) => {
          const r = getTrackRadius(tIdx), steps = item.stepsByTrackId[tInfo.track.id] || [];
          const trackAngles = item.stepAnglesByTrackId?.[tInfo.track.id] || gridAngles;
          const nSteps = Math.max(1, trackAngles.length);
          const arcDist = (2 * Math.PI * r) / nSteps, radialGap = radialSpan / Math.max(1.5, nTracks + 0.5);
          const baseStampR = Math.max(4.4, Math.min(8.2, arcDist * 0.42, radialGap * 0.44));
          return steps.map((rawVal, sIdx) => {
            if (rawVal === 0 || rawVal === '0' || rawVal === '' || rawVal === null || rawVal === undefined) return null;
            const angle = trackAngles[sIdx] ?? (-Math.PI / 2 + (sIdx / nSteps) * Math.PI * 2);
            const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r, isSplit = Array.isArray(rawVal);
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
                <polygon points={outerPts} fill="white" stroke="var(--cordel-paper-ink)" strokeWidth={0.65} strokeLinejoin="round" />
                <polygon points={polyPts} fill="white" stroke={tInfo.color} strokeWidth={isStrong ? 2.8 : 1.8} strokeLinejoin="round" />
                <text x={px} y={py + 0.4} textAnchor="middle" dominantBaseline="central" fill="var(--cordel-paper-ink)" fontSize={symText.length > 1 ? stampR * 0.85 : stampR * 1.15} fontWeight={900} fontFamily="Outfit, Inter, sans-serif">{symText}</text>
              </g>
            );
          });
        })}
        <circle cx={cx} cy={cy} r={innerR} fill="white" stroke="var(--cordel-paper-ink)" strokeWidth={1.7} />
        <circle cx={cx} cy={cy} r={innerR - 2.2} fill="none" stroke="var(--cordel-paper-ink)" strokeWidth={0.5} strokeDasharray="2,1.5" />
        <text x={cx} y={item.sectionName ? cy - 6 : (item.multiplierLabel ? cy - 4 : cy)} textAnchor="middle" dominantBaseline="central" fill="var(--cordel-paper-ink)" fontSize={fullLabel.length > 13 ? 6.0 : fullLabel.length > 8 ? 7.2 : 9.6} fontWeight={900} fontFamily="sans-serif">
          {fullLabel.length > 18 ? `${item.label.slice(0, 14)}…` : fullLabel}
        </text>
        {item.sectionName && (
          <text x={cx} y={cy + 6.5} textAnchor="middle" dominantBaseline="central" fill="var(--cordel-paper-ink)" fontSize={6.8} fontWeight={800} fontFamily="sans-serif">{item.sectionName.slice(0, 12).toUpperCase()}</text>
        )}
        {item.timeSig !== '4/4' && (
          <text x={cx} y={cy + (item.sectionName ? 14 : 9)} textAnchor="middle" dominantBaseline="central" fill="var(--cordel-paper-ink)" fillOpacity={0.7} fontSize={6.2} fontWeight={800} fontFamily="monospace">[{item.timeSig}]</text>
        )}
      </svg>
    </div>
  );
};
