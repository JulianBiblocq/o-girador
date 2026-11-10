import React, { useMemo } from 'react';
import { SpeakerProfileId } from '../../../audio/effects/studioFxPresets';

export const SpeakerProfileIcon: React.FC<{ profileId: SpeakerProfileId }> = ({ profileId }) => {
  if (profileId === 'headphones') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z" />
      </svg>
    );
  }
  if (profileId === 'usb_bt_speaker') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="5" width="16" height="14" />
        <circle cx="9" cy="12" r="2.5" />
        <circle cx="15" cy="12" r="2.5" />
      </svg>
    );
  }
  if (profileId === 'rehearsal_room') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="3,10 12,3 21,10 21,21 3,21" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </svg>
  );
};

interface StudioRackEqCurveSvgProps {
  lowDb: number;
  midDb: number;
  midFreqHz: number;
  midQMode: 'wide' | 'narrow';
  highDb: number;
  bassMonoEnabled: boolean;
  bassMonoCrossoverHz: number;
}

const freqToX = (f: number) => 24 + ((Math.log10(Math.max(20, Math.min(20000, f))) - Math.log10(20)) / 3) * 280;
const dbToY = (db: number) => 46 - (Math.max(-14, Math.min(14, db)) / 14) * 32;

export const StudioRackEqCurveSvg: React.FC<StudioRackEqCurveSvgProps> = ({
  lowDb,
  midDb,
  midFreqHz,
  midQMode,
  highDb,
  bassMonoEnabled,
  bassMonoCrossoverHz,
}) => {
  const geo = useMemo(() => {
    const crossX = Math.round(freqToX(bassMonoCrossoverHz));
    const qSigma = midQMode === 'narrow' ? 0.18 : 0.42;
    const logMid = Math.log10(Math.max(250, Math.min(4000, midFreqHz)));
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const logF = Math.log10(20) + (i / 40) * 3;
      const f = Math.pow(10, logF);
      const lowGain = lowDb / (1 + Math.pow(f / 115, 2.2));
      const highGain = highDb / (1 + Math.pow(3800 / f, 2.2));
      const midGain = midDb * Math.exp(-Math.pow(logF - logMid, 2) / (2 * qSigma * qSigma));
      const x = Math.round(24 + (i / 40) * 280);
      const y = Math.round(dbToY(lowGain + midGain + highGain));
      pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    return { crossX, curvePath: pts.join(' ') };
  }, [lowDb, midDb, midFreqHz, midQMode, highDb, bassMonoCrossoverHz]);

  return (
    <div className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2 rounded-none">
      <svg viewBox="0 0 320 92" className="w-full h-[84px] text-[var(--cordel-text)]">
        <defs>
          <pattern id="bassMonoHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--eq-low-color)" strokeWidth="2" strokeOpacity="0.45" />
          </pattern>
        </defs>
        <rect x="24" y="14" width="280" height="64" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="24" y1="46" x2="304" y2="46" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 2" />
        {bassMonoEnabled && (
          <rect x="24" y="14" width={Math.max(4, geo.crossX - 24)} height="64" fill="url(#bassMonoHatch)" stroke="var(--eq-low-color)" strokeWidth="1.4" />
        )}
        <path d={geo.curvePath} fill="none" stroke="var(--cordel-gold)" strokeWidth="2.5" />
        <text x="26" y="88" fontSize="8" fill="currentColor" className="font-mono">20Hz</text>
        <text x={Math.round(freqToX(100))} y="88" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">100Hz</text>
        <text x={Math.round(freqToX(1000))} y="88" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">1kHz</text>
        <text x="304" y="88" textAnchor="end" fontSize="8" fill="currentColor" className="font-mono">20kHz</text>
      </svg>
    </div>
  );
};

