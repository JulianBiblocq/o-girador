import React from 'react';
import { Download } from 'lucide-react';
import { XiloSun, XiloMoon, XiloFanion } from '../XiloIcons';
import { MiniTelemetryBadge } from '../TelemetryBadge';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface HeaderAuxiliaryControlsProps {
  lang: 'pt' | 'fr';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLangToggle: () => void;
  showInstallButton?: boolean;
  onInstallClick?: () => void;
  onOpenWallpaperModal?: () => void;
}

export const HeaderAuxiliaryControls: React.FC<HeaderAuxiliaryControlsProps> = ({
  lang,
  isDarkMode,
  onToggleDarkMode,
  onLangToggle,
  showInstallButton,
  onInstallClick,
  onOpenWallpaperModal,
}) => {
  const toggleSettings = useSequencerSettingsStore((state) => state.toggleSettings);
  const isPracticeMode = useSequencerStore((state) => state.isPracticeMode);

  return (
    <div className="flex-1 flex items-center justify-end flex-wrap gap-2.5">
      {showInstallButton && onInstallClick && (
        <button
          onClick={onInstallClick}
          className="bg-[#e67e22] text-[#1a1a1a] hover:opacity-90 px-3 h-[34px] text-xs font-bold font-cactus uppercase cordel-border-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          title={lang === 'pt' ? 'Instalar App' : "Installer l'app"}
        >
          <Download className="w-4 h-4" /> {lang === 'pt' ? 'Instalar' : 'Installer'}
        </button>
      )}

      <button
        onClick={onToggleDarkMode}
        className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-12 h-[34px] flex items-center justify-center cursor-pointer shrink-0"
        title={lang === 'pt' ? 'Modo Claro / Modo Escuro' : 'Mode clair / Mode sombre'}
      >
        {isDarkMode ? <XiloSun size={18} className="shrink-0" /> : <XiloMoon size={16} className="shrink-0" />}
      </button>

      {onOpenWallpaperModal && (
        <button
          onClick={onOpenWallpaperModal}
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-12 h-[34px] flex items-center justify-center cursor-pointer shrink-0"
          title={lang === 'pt' ? "Papel de Parede Trompe-l'Œil" : "Papier Peint Trompe-l'Œil"}
        >
          <XiloFanion size={18} className="shrink-0" />
        </button>
      )}

      <button
        onClick={onLangToggle}
        className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-12 h-[34px] flex items-center justify-center font-bold text-xs cursor-pointer shrink-0"
        title={lang === 'pt' ? 'Mudar idioma' : 'Changer de langue'}
      >
        {lang === 'pt' ? 'FR' : 'BR'}
      </button>

      {!isPracticeMode && (
        <div
          className="flex items-center gap-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-button px-3 h-[34px] cursor-pointer hover:bg-[#1a1a1a]/5 transition-colors select-none shrink-0"
          onClick={toggleSettings}
          title={lang === 'pt' ? 'A Oficina (Configurações) [O]' : "L'Atelier (Paramètres) [O]"}
        >
          <MiniTelemetryBadge />
          <span className="text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2L14 5H10L12 2Z" />
              <path d="M12 22L10 19H14L12 22Z" />
              <path d="M22 12L19 14V10L22 12Z" />
              <path d="M2 12L5 10V14L2 12Z" />
              <path d="M19.07 4.93L16.24 7.76L17.66 9.17L20.49 6.34L19.07 4.93Z" />
              <path d="M4.93 19.07L7.76 16.24L9.17 17.66L6.34 20.49L4.93 19.07Z" />
              <path d="M19.07 19.07L16.24 16.24L17.66 14.83L20.49 17.66L19.07 19.07Z" />
              <path d="M4.93 4.93L7.76 7.76L9.17 6.34L6.34 3.51L4.93 4.93Z" />
            </svg>
            <span>{lang === 'pt' ? 'A Oficina' : "L'Atelier"}</span>
          </span>
        </div>
      )}
    </div>
  );
};
