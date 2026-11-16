import React, { useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../../data';
import { getAlfaiaIconSizeClass } from '../../../utils/alfaiaUtils';
import { getInstrumentPrimaryStrongColor } from '../../../utils/colorHelpers';

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

  const [instrumentIdx, customName, isBusFolder, isMute, isSolo, hasAnySolo] = useSequencerStore(
    useShallow(
      useCallback((state) => {
        const tr = state.tracks.find((t) => t.id === trackId);
        const anySolo = state.tracks.some((t) => Boolean(t.isSolo));
        return [
          tr?.instrumentIdx ?? 0,
          tr?.customName ?? '',
          Boolean(tr?.isBusFolder),
          Boolean(tr?.isMute),
          Boolean(tr?.isSolo),
          anySolo,
        ] as const;
      }, [trackId])
    )
  );

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
  const instColor = getInstrumentPrimaryStrongColor(tInst, { id: trackId, customName: customName || undefined });
  const isSilenced = isMute || (hasAnySolo && !isSolo);

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
      style={{
        borderColor: isSolo ? 'var(--cordel-gold)' : instColor,
        boxShadow: isActive ? `2px 2px 0px ${instColor}` : '1px 1px 0px var(--cordel-shadow-color)',
      }}
      className={`xilo-wood-stamp shrink-0 flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-md flex items-center justify-center transition-all duration-150 relative select-none border-2 ${
        isActive
          ? 'bg-[var(--cordel-surface-elevated)] ring-2 ring-offset-1 ring-offset-[var(--cordel-ink-dark)] scale-105 z-10 cursor-default'
          : `bg-[var(--cordel-parchment-bg)]/90 hover:bg-[var(--cordel-surface-elevated)] ${isSilenced ? 'opacity-55' : 'opacity-85'} hover:opacity-100 hover:-translate-y-[1px] cursor-pointer`
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
        <span className="font-cactus font-bold text-xs text-[var(--cordel-ink-dark)] pointer-events-none">
          {titleText.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span
        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full pointer-events-none transition-all ${
          isActive ? 'w-4' : 'w-2.5 opacity-80'
        }`}
        style={{ backgroundColor: instColor }}
      />
    </button>
  );
});

PupitreRibbonChip.displayName = 'PupitreRibbonChip';
