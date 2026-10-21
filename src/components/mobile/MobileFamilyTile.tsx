/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Props {
  label: string;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onChangeVolume: (vol: number) => void;
  isLocked: boolean;
  isToada?: boolean;
  vocalMode?: 'voice' | 'synth' | 'both';
  onToggleVocalMode?: () => void;
}

export const MobileFamilyTile: React.FC<Props> = ({
  label,
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
  const handleSliderTouch = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChangeVolume(Math.round(ratio * 100));
  };

  return (
    <div className={`w-full h-full flex flex-col justify-between items-center p-1 bg-[#1a1a1a] border border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)] select-none ${
      isLocked ? 'opacity-80' : ''
    }`}>
      {/* Nom de la famille */}
      <span className="text-[9px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] truncate w-full text-center uppercase leading-none">
        {label}
      </span>

      {/* Boutons Mute & Solo */}
      <div className={`flex items-center gap-1 my-0.5 ${isLocked ? 'pointer-events-none' : ''}`}>
        <button
          onClick={onToggleMute}
          disabled={isLocked}
          className={`w-5 h-4.5 text-[9px] font-mono font-bold flex items-center justify-center border transition-colors ${
            isMuted
              ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]'
              : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={onToggleSolo}
          disabled={isLocked}
          className={`w-5 h-4.5 text-[9px] font-mono font-bold flex items-center justify-center border transition-colors ${
            isSolo
              ? 'bg-[#d4a017] text-black border-black'
              : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#d4a017]'
          }`}
          title="Solo"
        >
          S
        </button>
      </div>

      {/* Jauge de niveau tactile ou commutateur Toada */}
      {isToada && onToggleVocalMode ? (
        <div className="w-full flex flex-col gap-0.5">
          <button
            onClick={onToggleVocalMode}
            disabled={isLocked}
            className={`w-full text-[7.5px] font-mono font-bold py-0.2 border transition-colors uppercase truncate ${
              vocalMode !== 'synth'
                ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]'
                : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
            title="Basculer Voix / Synthétiseur"
          >
            {vocalMode === 'synth' ? 'SYNTH' : 'VOIX'}
          </button>
          <div
            onClick={handleSliderTouch}
            onTouchMove={handleSliderTouch}
            className={`w-full h-1.5 bg-[#121212] border border-[var(--cordel-border)] relative cursor-pointer ${
              isLocked ? 'pointer-events-none' : ''
            }`}
            style={{ touchAction: 'none' }}
          >
            <div className="h-full bg-[#b94a2c]" style={{ width: `${volume}%` }} />
          </div>
        </div>
      ) : (
        <div
          onClick={handleSliderTouch}
          onTouchMove={handleSliderTouch}
          className={`w-full h-2.5 bg-[#121212] border border-[var(--cordel-border)] relative cursor-pointer ${
            isLocked ? 'pointer-events-none' : ''
          }`}
          style={{ touchAction: 'none' }}
          title={`Volume: ${volume}%`}
        >
          <div className="h-full bg-[#b94a2c]" style={{ width: `${volume}%` }} />
        </div>
      )}
    </div>
  );
};
