import React, { useMemo } from 'react';
import { ReverbSpaceType } from '../../../audio/effects/studioFxPresets';

export const ReverbSpaceIcon: React.FC<{ spaceType: ReverbSpaceType }> = ({ spaceType }) => {
  if (spaceType === 'street') {
    return (
      <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 28V12l6-5 6 5v16M16 28V14l6-6 6 6v14" />
        <path d="M8 28v-6a2 2 0 0 1 4 0v6M20 28v-6a2 2 0 0 1 4 0v6" />
        <line x1="2" y1="28" x2="30" y2="28" />
      </svg>
    );
  }
  if (spaceType === 'wood_studio') {
    return (
      <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="3,12 16,4 29,12 29,27 3,27" />
        <line x1="8" y1="12" x2="8" y2="27" />
        <line x1="13" y1="12" x2="13" y2="27" />
        <line x1="19" y1="12" x2="19" y2="27" />
        <line x1="24" y1="12" x2="24" y2="27" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 28V14C3 7 16 3 16 3s13 4 13 11v14" />
      <path d="M8 28V16c0-4 8-7 8-7s8 3 8 7v12" />
      <line x1="2" y1="28" x2="30" y2="28" />
    </svg>
  );
};

interface StudioRackReverbSvgProps {
  preDelayMs: number;
  decaySec: number;
  lowCutHz: number;
  dampHz: number;
  stereoWidth: number;
  spaceType: ReverbSpaceType;
}

export const StudioRackReverbSvg: React.FC<StudioRackReverbSvgProps> = ({
  preDelayMs,
  decaySec,
  lowCutHz,
  dampHz,
  stereoWidth,
  spaceType,
}) => {
  const geo = useMemo(() => {
    const preX = 32 + Math.round((Math.max(0, Math.min(80, preDelayMs)) / 80) * 58);
    const tailLen = Math.round(((Math.max(0.4, Math.min(4.0, decaySec)) - 0.4) / 3.6) * 185) + 45;
    const endX = Math.min(308, preX + tailLen);
    const dampNorm = (Math.max(2500, Math.min(12000, dampHz)) - 2500) / 9500;
    const midY = 58 - Math.round(dampNorm * 16);
    const reflections = [0.06, 0.14, 0.23, 0.34, 0.47, 0.62].map((r, idx) => {
      const rx = Math.min(304, preX + Math.round(r * tailLen * 0.55));
      const baseH = 54 - idx * 6;
      const spread = (stereoWidth / 100) * (spaceType === 'great_hall' ? 6 : 3);
      return { x: rx, topY: Math.max(14, 78 - baseH - Math.round(spread)), index: idx };
    });
    const curvePath = `M ${preX} 20 Q ${Math.round((preX + endX) * 0.48)} ${midY}, ${endX} 78 L ${preX} 78 Z`;
    return { preX, endX, reflections, curvePath };
  }, [preDelayMs, decaySec, dampHz, stereoWidth, spaceType]);

  return (
    <div className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2 rounded-none">
      <svg viewBox="0 0 320 92" className="w-full h-[84px] text-[var(--cordel-text)]">
        <line x1="16" y1="78" x2="310" y2="78" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
        {/* Impulsion sèche */}
        <line x1="24" y1="78" x2="24" y2="12" stroke="currentColor" strokeWidth="3" />
        <circle cx="24" cy="12" r="3" fill="currentColor" />
        {/* Écart Pré-Délai */}
        <line x1="26" y1="45" x2={geo.preX - 2} y2="45" stroke="currentColor" strokeDasharray="3 2" strokeWidth="1.2" />
        <text x={Math.round((24 + geo.preX) / 2)} y="39" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">
          {Math.round(preDelayMs)} ms
        </text>
        {/* Queue de décroissance */}
        <path d={geo.curvePath} fill="var(--fx-reverb-accent)" fillOpacity="0.28" stroke="var(--fx-reverb-accent)" strokeWidth="2" />
        {/* 6 barres de premières réflexions */}
        {geo.reflections.map((bar) => (
          <line
            key={bar.index}
            x1={bar.x}
            y1="78"
            x2={bar.x}
            y2={bar.topY}
            stroke="var(--fx-reverb-accent)"
            strokeWidth="2.2"
          />
        ))}
        {/* Annotations acoustiques */}
        <text x="308" y="18" textAnchor="end" fontSize="8.5" fill="currentColor" className="font-mono font-bold">
          RT60 {decaySec.toFixed(1)}s | HPF {Math.round(lowCutHz)}Hz | LPF {(dampHz / 1000).toFixed(1)}kHz
        </text>
      </svg>
    </div>
  );
};

