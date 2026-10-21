import React from 'react';

interface Props {
  label: string;
  icon: string;
  color: string;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onChangeVolume: (vol: number) => void;
  isLocked: boolean;
  isToada?: boolean;
  vocalMode?: 'voice' | 'synth';
  onToggleVocalMode?: () => void;
}

export const MobileFamilyStrip: React.FC<Props> = ({
  label,
  icon,
  color,
  isMuted,
  isSolo,
  volume,
  onToggleMute,
  onToggleSolo,
  onChangeVolume,
  isLocked,
  isToada,
  vocalMode,
  onToggleVocalMode,
}) => {
  return (
    <div
      className={`p-2 cordel-border-sm flex items-center justify-between gap-2 select-none transition-all ${
        isMuted
          ? 'bg-black/10 opacity-60'
          : isSolo
          ? 'bg-amber-100/90 shadow-[2px_2px_0px_#000]'
          : 'bg-[var(--cordel-bg)]'
      }`}
      style={{ borderLeftWidth: '5px', borderLeftColor: color }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xl shrink-0">{icon}</span>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-cactus font-bold text-sm text-[var(--cordel-text)] truncate">
              {label}
            </span>
            {isToada && onToggleVocalMode && (
              <button
                disabled={isLocked}
                onClick={onToggleVocalMode}
                className="px-1.5 py-0.5 cordel-border-sm text-[10px] font-cactus font-bold uppercase bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] shrink-0"
                title="Basculer Voix enregistrée / Synthé guide"
              >
                {vocalMode === 'synth' ? '🎹 Synth' : '🎙️ Voix'}
              </button>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            disabled={isLocked}
            value={volume}
            onChange={(e) => onChangeVolume(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--cordel-wood)] h-2 cursor-pointer mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          disabled={isLocked}
          onClick={onToggleMute}
          className={`w-9 h-9 cordel-border-sm font-cactus font-bold text-sm flex items-center justify-center transition-colors cursor-pointer ${
            isMuted
              ? 'bg-red-600 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-red-100'
          }`}
          title="Mute famille"
        >
          M
        </button>
        <button
          disabled={isLocked}
          onClick={onToggleSolo}
          className={`w-9 h-9 cordel-border-sm font-cactus font-bold text-sm flex items-center justify-center transition-colors cursor-pointer ${
            isSolo
              ? 'bg-[#f1c40f] text-[#1a1a1a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-yellow-100'
          }`}
          title="Solo famille"
        >
          S
        </button>
      </div>
    </div>
  );
};
