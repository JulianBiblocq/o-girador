import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Sun, Moon, Check } from 'lucide-react';
import { WallpaperCard, WallpaperPattern } from './WallpaperCard';

interface WallpaperShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: WallpaperPattern;
  onApplyWallpaper: (pattern: WallpaperPattern) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  lang?: 'fr' | 'pt';
}

export const WallpaperShowcaseModal: React.FC<WallpaperShowcaseModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  onApplyWallpaper,
  isDarkMode,
  onToggleDarkMode,
  lang = 'fr',
}) => {
  const [selected, setSelected] = useState<WallpaperPattern>(currentWallpaper);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen) return null;

  const isPt = lang === 'pt';

  const patternsConfig: {
    id: WallpaperPattern;
    title: string;
    subtitle: string;
    badge: string;
  }[] = [
    {
      id: 'rosace',
      title: isPt ? 'Opção A : Rosácea Azulejo' : 'Option A : Rosace Azulejo',
      subtitle: isPt
        ? 'Simetria radial D4 clássica. Alfaias no centro, Gonguês e Caixas nas extremidades.'
        : 'Symétrie radiale D4. Alfaias en fleur centrale, Gonguês et Caixas aux intersections.',
      badge: isPt ? 'Azulejo' : 'Dominoté',
    },
    {
      id: 'damas',
      title: isPt ? 'Opção B : Damasco 45°' : 'Option B : Damassé 45°',
      subtitle: isPt
        ? 'Treliça em losango diagonal. Linhas de Mineiros ritmadas com instrumentos nas células.'
        : 'Treillis géométrique en losange. Trame de Mineiros abritant les fûts de bateria.',
      badge: '45° Mesh',
    },
    {
      id: 'gravure',
      title: isPt ? 'Opção C : Gravura Cordel' : 'Option C : Gravure & Semis',
      subtitle: isPt
        ? 'Distribuição orgânica estilo xilogravura. Instrumentos soltos sem orientação fixa.'
        : 'Semis organique esprit taille-douce. Instruments flottants sans haut ni bas.',
      badge: 'Xilografia',
    },
    {
      id: 'none',
      title: isPt ? 'Sem Papel de Parede' : 'Désactivé',
      subtitle: isPt
        ? 'Fundo liso padrão do aplicativo sem textura de filigrana.'
        : "Fond uni de l'application sans filigrane vectoriel.",
      badge: 'Clean',
    },
  ];

  const handleApply = () => {
    onApplyWallpaper(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-[var(--cordel-border)] flex items-center justify-between">
          <div>
            <h2 className="font-cactus text-xl font-bold tracking-wide">
              {isPt ? "Papel de Parede Trompe-l'Œil Maracatu" : "Papier Peint Trompe-l'Œil Maracatu"}
            </h2>
            <p className="text-xs opacity-75 font-sans mt-0.5">
              {isPt
                ? 'Textura sutil à distância, instrumentos revelados no olhar aproximado.'
                : 'Trame discrète à distance normale, instruments révélés au regard attentif.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barre d'outils interactifs (Loupe & Thème) */}
        <div className="px-4 py-2 bg-[var(--cordel-text)]/5 border-b border-[var(--cordel-border)]/40 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold transition-colors cursor-pointer"
            >
              {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
              <span>{isZoomed ? (isPt ? 'Zoom ×1 (Normal)' : 'Zoom ×1 (Distance)') : (isPt ? 'Loupe ×2.5 (Detalhe)' : 'Loupe ×2.5 (Détails)')}</span>
            </button>
            <span className="text-[11px] opacity-60 font-mono hidden sm:inline">
              {isZoomed ? '🔍 14px ➔ 35px' : '👁️ Trame 14px-20px'}
            </span>
          </div>

          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDarkMode ? (isPt ? 'Modo Claro' : 'Mode Jour') : (isPt ? 'Modo Escuro' : 'Mode Nuit')}</span>
          </button>
        </div>

        {/* Grille des 4 variantes */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
          {patternsConfig.map((item) => (
            <WallpaperCard
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              badge={item.badge}
              isSelected={selected === item.id}
              isZoomed={isZoomed}
              onSelect={() => setSelected(item.id)}
            />
          ))}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t-2 border-[var(--cordel-border)] bg-[var(--cordel-text)]/5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-[var(--cordel-border)] text-xs font-bold uppercase hover:bg-[var(--cordel-text)]/10 transition-colors cursor-pointer"
          >
            {isPt ? 'Cancelar' : 'Fermer'}
          </button>

          <button
            onClick={handleApply}
            className="px-5 py-2 bg-[var(--cordel-wood)] text-white border-2 border-[var(--cordel-border)] font-cactus font-bold text-sm tracking-wide uppercase shadow-[3px_3px_0_var(--cordel-border)] hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            <span>{isPt ? 'Aplicar ao Fundo' : "Appliquer au fond de l'app"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
