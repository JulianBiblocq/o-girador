import React from 'react';
import { Download } from 'lucide-react';
import { XiloSun, XiloMoon, XiloFanion } from '../XiloIcons';
import { MiniTelemetryBadge } from '../TelemetryBadge';
import { GoogleLoginButton } from '../GoogleLoginButton';
import { HeaderDualScreenControl } from './HeaderDualScreenControl';
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
  onAdminClick?: () => void;
}

export const HeaderAuxiliaryControls: React.FC<HeaderAuxiliaryControlsProps> = ({
  lang,
  isDarkMode,
  onToggleDarkMode,
  onLangToggle,
  showInstallButton,
  onInstallClick,
  onOpenWallpaperModal,
  onAdminClick,
}) => {
  const toggleSettings = useSequencerSettingsStore((state) => state.toggleSettings);
  const isPracticeMode = useSequencerStore((state) => state.isPracticeMode);

  return (
    <div className="flex xl:flex-1 min-w-0 items-center justify-end flex-nowrap gap-1.5 xl:gap-2 shrink-0">
      {showInstallButton && onInstallClick && (
        <button
          type="button"
          onClick={onInstallClick}
          className="bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] hover:opacity-90 px-2.5 xl:px-3 h-[34px] text-[11px] xl:text-xs font-bold font-cactus uppercase border-2 border-[var(--cordel-border-strong)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-[2px_2px_0_var(--cordel-shadow-color)]"
          title={lang === 'pt' ? 'Instalar App' : "Installer l'application"}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden 2xl:inline">{lang === 'pt' ? 'Instalar' : 'Installer'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onToggleDarkMode}
        className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-8 xl:w-10 2xl:w-11 h-[34px] flex items-center justify-center cursor-pointer shrink-0"
        title={lang === 'pt' ? 'Modo Claro / Modo Escuro' : 'Mode clair / Mode sombre'}
      >
        {isDarkMode ? <XiloSun size={17} className="shrink-0" /> : <XiloMoon size={15} className="shrink-0" />}
      </button>

      {onOpenWallpaperModal && (
        <button
          type="button"
          onClick={onOpenWallpaperModal}
          className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-8 xl:w-10 2xl:w-11 h-[34px] flex items-center justify-center cursor-pointer shrink-0"
          title={lang === 'pt' ? "Papel de Parede Trompe-l'Œil" : "Papier Peint Trompe-l'Œil"}
        >
          <XiloFanion size={17} className="shrink-0" />
        </button>
      )}

      <button
        type="button"
        onClick={onLangToggle}
        className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] cordel-button w-8 xl:w-10 2xl:w-11 h-[34px] flex items-center justify-center font-bold text-xs cursor-pointer shrink-0"
        title={lang === 'pt' ? 'Mudar idioma' : 'Changer de langue'}
      >
        {lang === 'pt' ? 'FR' : 'BR'}
      </button>

      {!isPracticeMode && <HeaderDualScreenControl lang={lang} />}

      {!isPracticeMode && (
        <button
          type="button"
          data-tour-id="header-oficina-btn"
          className="flex items-center gap-1.5 xl:gap-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-button px-2 xl:px-3 h-[34px] cursor-pointer hover:bg-[var(--cordel-surface)] transition-colors select-none shrink-0 whitespace-nowrap"
          onClick={toggleSettings}
          title={lang === 'pt' ? 'A Oficina (Configurações) [O]' : 'A Oficina (Paramètres) [O]'}
        >
          <MiniTelemetryBadge />
          <span className="text-[var(--cordel-text)] font-cactus font-bold text-[11px] xl:text-xs uppercase flex items-center gap-1.5 whitespace-nowrap">
            <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.5] shrink-0" viewBox="0 0 24 24" strokeLinecap="square">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2L14 5H10L12 2ZM12 22L10 19H14L12 22ZM22 12L19 14V10L22 12ZM2 12L5 10V14L2 12Z" />
            </svg>
            <span>A Oficina</span>
          </span>
        </button>
      )}

      <GoogleLoginButton className="shrink-0" lang={lang} onAdminClick={onAdminClick} align="right" showVisitorMenu />
    </div>
  );
};
