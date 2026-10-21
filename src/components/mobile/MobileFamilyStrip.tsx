/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { faderPositionToDbString, UNITY_GAIN_FADER_POSITION } from '../../utils/audioMath';

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

export const MobileFamilyStrip: React.FC<Props> = ({
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
  const trackRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const calculateVolumeFromPointer = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    onChangeVolume(Math.round(ratio * 100));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onChangeVolume(UNITY_GAIN_FADER_POSITION);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateVolumeFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isLocked) return;
    calculateVolumeFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const dbText = faderPositionToDbString(volume);

  return (
    <div className={`h-full flex flex-col items-center justify-between p-1 bg-[#1a1a1a] border-x border-[var(--cordel-border)] select-none ${isLocked ? 'opacity-80' : ''}`}>
      <div className="w-full flex flex-col items-center shrink-0">
        <span className="font-cactus font-bold text-[10px] sm:text-xs uppercase text-[var(--cordel-text)] truncate w-full text-center">
          {label}
        </span>
        <span className="font-mono text-[8px] text-[#f4ecd8]/60 leading-none mt-0.5">
          {dbText}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-1 w-full max-w-[40px] my-1 bg-[#121212] border-2 border-[var(--cordel-border)] relative cursor-ns-resize flex items-end justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div
          className="w-full bg-[#b94a2c]/40 border-t-2 border-[#b94a2c] pointer-events-none transition-none"
          style={{ height: `${volume}%` }}
        />
        <div
          className="absolute left-0 right-0 h-4 bg-[#f4ecd8] border border-[var(--cordel-border)] shadow-[0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center pointer-events-none"
          style={{ bottom: `calc(${volume}% - 8px)` }}
        >
          <div className="w-4 h-0.5 bg-[#1a1a1a]" />
        </div>
      </div>

      {isToada && onToggleVocalMode && (
        <button
          onClick={onToggleVocalMode}
          disabled={isLocked}
          className={`w-full py-0.5 mb-1 font-cactus font-bold text-[9px] uppercase border transition-colors ${
            vocalMode !== 'synth' ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)]'
          }`}
          title="Basculer Voix chantée / Synthétiseur"
        >
          {vocalMode === 'synth' ? 'SYNTH' : 'VOIX'}
        </button>
      )}

      <div className="w-full grid grid-cols-2 gap-1 shrink-0">
        <button
          onClick={onToggleMute}
          disabled={isLocked}
          className={`h-7 font-mono font-bold text-xs flex items-center justify-center border-2 transition-colors ${
            isMuted ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)]'
          }`}
          title="Mute"
        >
          M
        </button>
        <button
          onClick={onToggleSolo}
          disabled={isLocked}
          className={`h-7 font-mono font-bold text-xs flex items-center justify-center border-2 transition-colors ${
            isSolo ? 'bg-[#d4a017] text-black border-black font-extrabold' : 'bg-[#121212] text-[var(--cordel-text)] border-[var(--cordel-border)]'
          }`}
          title="Solo"
        >
          S
        </button>
      </div>
    </div>
  );
};
