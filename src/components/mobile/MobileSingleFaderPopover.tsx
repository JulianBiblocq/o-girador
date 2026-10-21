/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { faderPositionToDbString, UNITY_GAIN_FADER_POSITION } from '../../utils/audioMath';

interface Props {
  label: string;
  volume: number;
  onChangeVolume: (vol: number) => void;
  onClose: () => void;
}

export const MobileSingleFaderPopover: React.FC<Props> = ({ label, volume, onChangeVolume, onClose }) => {
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
    if (isDraggingRef.current) calculateVolumeFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  const handleCartoucheClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onChangeVolume(UNITY_GAIN_FADER_POSITION);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-[260px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] p-4 flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between border-b border-[var(--cordel-border)]/40 pb-2">
          <span className="font-cactus font-bold text-base uppercase tracking-wider text-[#b94a2c]">{label}</span>
          <button onClick={onClose} className="p-1 hover:text-[#b94a2c] active:scale-95 cursor-pointer" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-56 w-16 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] relative cursor-ns-resize flex items-end justify-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          {/* Repère visuel 0 dB (Unity Gain à 75%) */}
          <div className="absolute left-0 right-0 border-b border-dashed border-[#f4ecd8]/40 pointer-events-none z-10 flex justify-end pr-1" style={{ bottom: '75%' }}>
            <span className="text-[8px] font-mono text-[#f4ecd8]/60 leading-none -mt-2.5">0dB</span>
          </div>

          <div className="w-full bg-[#b94a2c]/50 border-t-2 border-[#b94a2c] pointer-events-none transition-none" style={{ height: `${volume}%` }} />
          <div
            className="absolute left-0 right-0 h-6 bg-[#f4ecd8] border-2 border-[var(--cordel-border)] shadow-[0_3px_6px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none z-20"
            style={{ bottom: `calc(${volume}% - 12px)` }}
          >
            <div className="w-8 h-1 bg-[#1a1a1a]" />
          </div>
        </div>

        <button
          onClick={handleCartoucheClick}
          className="w-full py-1.5 px-3 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-border)] font-mono font-bold text-sm text-center tabular-nums shadow-[2px_2px_0_var(--cordel-border)] active:scale-95 cursor-pointer"
          title="Double-clic pour remettre à 0.0 dB"
        >
          {faderPositionToDbString(volume)}
        </button>
      </div>
    </div>
  );
};
