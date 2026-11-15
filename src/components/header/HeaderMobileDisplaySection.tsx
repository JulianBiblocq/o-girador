import React from 'react';
import { Sliders } from 'lucide-react';
import { XiloSun, XiloMoon } from '../XiloIcons';
import { openAoVivoLabWithActiveTrack } from '../AoVivo/aoVivoStrokeTester';

interface HeaderMobileDisplaySectionProps {
  lang: 'pt' | 'fr';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLangToggle: () => void;
  onCloseMenu: () => void;
}

export const HeaderMobileDisplaySection: React.FC<HeaderMobileDisplaySectionProps> = ({
  lang,
  isDarkMode,
  onToggleDarkMode,
  onLangToggle,
  onCloseMenu,
}) => {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-2.5">
      <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide flex items-center gap-1 font-cactus">
        {lang === 'pt' ? 'Visualização & Idioma' : 'Affichage & Langue'}
      </span>
      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
        <button
          type="button"
          onClick={() => { onToggleDarkMode(); onCloseMenu(); }}
          className="px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-center gap-1"
        >
          {isDarkMode ? (
            <><XiloSun size={12} className="shrink-0" /> {lang === 'pt' ? 'Modo Claro' : 'Mode clair'}</>
          ) : (
            <><XiloMoon size={11} className="shrink-0" /> {lang === 'pt' ? 'Modo Escuro' : 'Mode sombre'}</>
          )}
        </button>
        <button
          type="button"
          onClick={() => { onLangToggle(); onCloseMenu(); }}
          className="px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer"
        >
          {lang === 'pt' ? 'FR' : 'BR'}
        </button>
        <button
          type="button"
          onClick={() => { openAoVivoLabWithActiveTrack(); onCloseMenu(); }}
          className="px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-center gap-1 col-span-2"
        >
          <Sliders size={12} className="shrink-0" />
          <span>{lang === 'pt' ? 'Labo Posição Ao Vivo (Mobile)' : 'Labo Position Ao Vivo (Mobile)'}</span>
        </button>
      </div>
    </div>
  );
};
