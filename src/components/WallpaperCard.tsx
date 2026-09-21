import React from 'react';

export type WallpaperPattern = 'none' | 'rosace' | 'damas' | 'gravure';

interface WallpaperCardProps {
  id: WallpaperPattern;
  title: string;
  subtitle: string;
  badge: string;
  isSelected: boolean;
  isZoomed: boolean;
  onSelect: () => void;
}

export const WallpaperCard: React.FC<WallpaperCardProps> = ({
  id,
  title,
  subtitle,
  badge,
  isSelected,
  isZoomed,
  onSelect,
}) => {
  const maskClass =
    id === 'rosace'
      ? 'wallpaper-mask-rosace'
      : id === 'damas'
      ? 'wallpaper-mask-damas'
      : id === 'gravure'
      ? 'wallpaper-mask-gravure'
      : '';

  // Taille du masque selon l'état de la loupe
  const maskSizeStyle = isZoomed
    ? { WebkitMaskSize: id === 'gravure' ? '280px 280px' : '240px 240px', maskSize: id === 'gravure' ? '280px 280px' : '240px 240px' }
    : undefined;

  return (
    <div
      onClick={onSelect}
      className={`relative p-3 border-2 cursor-pointer transition-all flex flex-col gap-2 rounded-sm select-none ${
        isSelected
          ? 'border-[var(--cordel-wood)] shadow-[0_0_0_2px_var(--cordel-wood),4px_4px_0_var(--cordel-border)] bg-[var(--cordel-text)]/5'
          : 'border-[var(--cordel-border)]/60 hover:border-[var(--cordel-border)] hover:bg-[var(--cordel-text)]/5'
      }`}
    >
      {/* Header vignette */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-cactus text-sm font-bold tracking-wide uppercase truncate">
          {title}
        </span>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-[var(--cordel-border)]/40 opacity-75 shrink-0">
          {badge}
        </span>
      </div>

      {/* Swatch zone avec mask-image GPU */}
      <div className="relative h-24 w-full rounded border border-[var(--cordel-border)]/40 overflow-hidden bg-[var(--cordel-bg)] flex items-center justify-center">
        {id === 'none' ? (
          <span className="text-xs opacity-50 italic font-mono">
            ∅ Uni / Sem textura
          </span>
        ) : (
          <div
            className={`absolute inset-0 transition-all duration-300 ${maskClass}`}
            style={{
              opacity: isZoomed ? 0.45 : 0.22,
              ...maskSizeStyle,
            }}
          />
        )}
      </div>

      {/* Subtitle / Explication */}
      <p className="text-[11px] opacity-75 leading-tight font-sans line-clamp-2">
        {subtitle}
      </p>

      {/* Indicateur de sélection */}
      <div className="mt-auto pt-1 flex items-center justify-between text-xs">
        <span className="text-[11px] font-mono opacity-60">
          {isSelected ? '✓ Actif' : 'Sélectionner'}
        </span>
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 border-[var(--cordel-border)] flex items-center justify-center ${
            isSelected ? 'bg-[var(--cordel-wood)] border-[var(--cordel-wood)]' : ''
          }`}
        >
          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[var(--cordel-bg)]" />}
        </div>
      </div>
    </div>
  );
};
