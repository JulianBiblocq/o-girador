import React, { useMemo } from 'react';
import { TubeSaturationCharacter } from '../../../audio/effects/studioFxPresets';

interface StudioRackBulbSvgProps {
  drive: number;
  preHpfHz: number;
  toneHz: number;
  character: TubeSaturationCharacter;
  bassShieldLabel: string;
}

export const StudioRackBulbSvg: React.FC<StudioRackBulbSvgProps> = ({
  drive,
  preHpfHz,
  toneHz,
  character,
  bassShieldLabel,
}) => {
  const geo = useMemo(() => {
    const driveNorm = Math.max(0, Math.min(1, drive / 100));
    const shieldWidth = 18 + Math.round(((Math.max(60, Math.min(300, preHpfHz)) - 60) / 240) * 62);
    const k = 1.2 + driveNorm * (character === 'biting_filament' ? 5.2 : 3.4);
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const xNorm = (i / 12) - 1;
      const yNorm = Math.tanh(xNorm * k) / Math.tanh(k);
      const px = 195 + Math.round((i / 24) * 105);
      const py = 46 - Math.round(yNorm * 30);
      pts.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
    }
    return { driveNorm, shieldWidth, curvePath: pts.join(' ') };
  }, [drive, preHpfHz, character]);

  return (
    <div className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2 rounded-none">
      <svg viewBox="0 0 320 92" className="w-full h-[84px] text-[var(--cordel-text)]">
        {/* Gauche : Lampe radio gravée à filament incandescent */}
        <rect x="20" y="68" width="28" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="25" y1="82" x2="25" y2="88" stroke="currentColor" strokeWidth="2" />
        <line x1="34" y1="82" x2="34" y2="88" stroke="currentColor" strokeWidth="2" />
        <line x1="43" y1="82" x2="43" y2="88" stroke="currentColor" strokeWidth="2" />
        <path d="M22 68V30a12 12 0 0 1 24 0v38" fill="var(--fx-disto-accent)" fillOpacity={0.1 + geo.driveNorm * 0.45} stroke="currentColor" strokeWidth="2" />
        {/* Filament central */}
        <path
          d={character === 'biting_filament' ? 'M28 68L31 36L34 52L37 36L40 68' : 'M28 68Q34 28 40 68'}
          fill="none"
          stroke="var(--fx-disto-accent)"
          strokeWidth={1.8 + geo.driveNorm * 1.8}
        />
        {/* Rayons gravés selon le Grain */}
        {geo.driveNorm > 0.08 && (
          <g stroke="var(--fx-disto-accent)" strokeWidth="1.6" opacity={0.3 + geo.driveNorm * 0.7}>
            <line x1="8" y1="36" x2="16" y2="39" />
            <line x1="6" y1="48" x2="15" y2="48" />
            <line x1="52" y1="39" x2="60" y2="36" />
            <line x1="53" y1="48" x2="62" y2="48" />
            <line x1="34" y1="6" x2="34" y2="14" />
          </g>
        )}

        {/* Centre : Bouclier Grave < preHpfHz */}
        <rect x="76" y="16" width={geo.shieldWidth} height="62" fill="var(--eq-high-color)" fillOpacity="0.2" stroke="var(--eq-high-color)" strokeWidth="1.5" strokeDasharray="3 2" />
        <text x="80" y="28" fontSize="7.5" fill="currentColor" className="font-mono font-bold">
          {bassShieldLabel}
        </text>
        <text x="80" y="72" fontSize="8.5" fill="currentColor" className="font-mono font-bold">
          &lt; {Math.round(preHpfHz)} Hz
        </text>

        {/* Droite : Courbe de transfert en S */}
        <rect x="195" y="16" width="105" height="60" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
        <line x1="195" y1="46" x2="300" y2="46" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
        <line x1="247" y1="16" x2="247" y2="76" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
        <path d={geo.curvePath} fill="none" stroke="var(--fx-disto-accent)" strokeWidth="2.4" />
        <text x="298" y="87" textAnchor="end" fontSize="8" fill="currentColor" className="font-mono font-bold">
          LPF {(toneHz / 1000).toFixed(1)} kHz
        </text>
      </svg>
    </div>
  );
};

