
import React from 'react';
import { Check } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';

interface TrackSelectorButtonProps {
  track: any;
  isSelected: boolean;
  onClick: () => void;
  label: string;
  orderNumber: number;
}

export const TrackSelectorButton: React.FC<TrackSelectorButtonProps> = ({
  track,
  isSelected,
  onClick,
  label,
  orderNumber,
}) => {
  const inst = instrumentsConfig[track.instrumentIdx];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
          : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)]'
      }`}
    >
      <img
        src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
        alt={inst?.name}
        className="w-4 h-4 object-contain shrink-0"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
      <span>{label} ({orderNumber})</span>
      {isSelected && <Check size={12} className="ml-1 shrink-0" />}
    </button>
  );
};
