import React from 'react';

export interface SpeakerProfile {
  id: string;
  label: string;
  icon: string;
  eq: { low: number; mid: number; high: number };
}

export const SPEAKER_PROFILES: SpeakerProfile[] = [
  { id: 'speaker', label: 'Enceinte USB/BT', icon: '🔊', eq: { low: 2.5, mid: -1.5, high: 2.0 } },
  { id: 'hall', label: 'Salle / Studio', icon: '🏛️', eq: { low: -3.0, mid: 1.5, high: -1.0 } },
  { id: 'headphones', label: 'Casque Neutre', icon: '🎧', eq: { low: 0, mid: 0, high: 0 } },
  { id: 'focus_dance', label: 'Focus Danse & Chant', icon: '🗣️', eq: { low: -2.0, mid: 3.0, high: 1.0 } },
];

interface Props {
  currentEQ: { low: number; mid: number; high: number };
  onApplyEQ: (eq: { low: number; mid: number; high: number }) => void;
  disabled?: boolean;
}

export const MobileSpeakerEqSelector: React.FC<Props> = ({
  currentEQ,
  onApplyEQ,
  disabled = false,
}) => {
  const isProfileActive = (profile: SpeakerProfile) =>
    Math.abs(profile.eq.low - currentEQ.low) < 0.2 &&
    Math.abs(profile.eq.mid - currentEQ.mid) < 0.2 &&
    Math.abs(profile.eq.high - currentEQ.high) < 0.2;

  return (
    <div className="w-full px-3 py-1.5 flex flex-col gap-1 select-none">
      <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text)] opacity-75">
        Profil Sonore Enceinte
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {SPEAKER_PROFILES.map((p) => {
          const active = isProfileActive(p);
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => onApplyEQ(p.eq)}
              className={`px-2 py-1.5 cordel-border-sm text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-black/5 opacity-80'
              }`}
            >
              <span className="text-sm shrink-0">{p.icon}</span>
              <span className="font-cactus font-bold text-xs truncate leading-tight">
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
