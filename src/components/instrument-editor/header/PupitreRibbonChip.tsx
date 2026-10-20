/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../../data';
import { getAlfaiaIconSizeClass } from '../../../utils/alfaiaUtils';

export interface PupitreRibbonChipProps {
  trackId: number;
  isActive: boolean;
  onSelect: (id: number) => void;
  onContextMenu: (id: number, x: number, y: number) => void;
}

export const PupitreRibbonChip: React.FC<PupitreRibbonChipProps> = React.memo(({
  trackId, isActive, onSelect, onContextMenu,
}) => {
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const instrumentIdx = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId)?.instrumentIdx ?? 0);
  const customName = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId)?.customName);
  const isBusFolder = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId)?.isBusFolder);

  useEffect(() => {
    if (isActive && chipRef.current) {
      chipRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isActive]);

  const toadaConfig = instrumentsConfig.find((i) => i.id === 'toada') || instrumentsConfig[12];
  const isToada = (isBusFolder && (customName === 'Toada' || String(trackId) === 'toada')) || instrumentIdx === 12;
  const tInst = isToada && toadaConfig ? toadaConfig : instrumentsConfig[instrumentIdx];
  const iconSizeClass = getAlfaiaIconSizeClass(tInst?.id);
  const titleText = isToada ? 'Toada' : (customName || tInst?.name || 'Instrument');

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      longPressTimerRef.current = setTimeout(() => {
        onContextMenu(trackId, touch.clientX, touch.clientY);
        longPressTimerRef.current = null;
      }, 400);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimerRef.current && touchStartPosRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      if (Math.abs(touch.clientX - touchStartPosRef.current.x) > 10 || Math.abs(touch.clientY - touchStartPosRef.current.y) > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  return (
    <button
      ref={chipRef}
      type="button"
      onClick={() => { if (!isActive) onSelect(trackId); }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(trackId, e.clientX, e.clientY);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      title={titleText}
      className={`shrink-0 flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-md flex items-center justify-center transition-all duration-150 relative select-none ${
        isActive
          ? 'bg-[#fbf8f0] border-2 border-[#1a1a1a] ring-2 ring-[#d4af37] ring-offset-1 ring-offset-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] scale-105 z-10 cursor-default'
          : 'bg-[#f4ecd8]/90 hover:bg-[#fbf8f0] border-2 border-[#1a1a1a]/50 hover:border-[#1a1a1a] shadow-[1px_1px_0px_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0px_#1a1a1a] opacity-75 hover:opacity-100 hover:-translate-y-[1px] cursor-pointer'
      }`}
    >
      {tInst?.iconImg ? (
        <img
          src={`${ASSETS_BASE_URL}${tInst.iconImg}`}
          alt={titleText}
          className={`${iconSizeClass} object-contain transition-transform pointer-events-none`}
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
      ) : (
        <span className="font-cactus font-bold text-xs text-[#1a1a1a] pointer-events-none">
          {titleText.slice(0, 2).toUpperCase()}
        </span>
      )}
    </button>
  );
});

PupitreRibbonChip.displayName = 'PupitreRibbonChip';
