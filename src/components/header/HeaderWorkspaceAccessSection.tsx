import React from 'react';
import { SlidersHorizontal, Wrench } from 'lucide-react';
import { GoogleLoginButton } from '../GoogleLoginButton';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

interface HeaderWorkspaceAccessSectionProps {
  lang: 'pt' | 'fr';
  onAdminClick?: () => void;
  onCloseMenu: () => void;
  showAccountBadge?: boolean;
}

export const HeaderWorkspaceAccessSection: React.FC<HeaderWorkspaceAccessSectionProps> = ({
  lang,
  onAdminClick,
  onCloseMenu,
  showAccountBadge = false,
}) => {
  const isPt = lang === 'pt';
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode);
  const toggleSettings = useSequencerSettingsStore((s) => s.toggleSettings);
  const setIsProfileModalOpen = useSequencerSettingsStore((s) => s.setIsProfileModalOpen);
  const showOficina = !isPracticeMode || showAccountBadge;

  return (
    <div className="flex flex-col gap-1.5 border-b border-[var(--cordel-border)]/30 pb-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide font-cactus">
          {isPt ? 'Atelier & Preferências' : 'Atelier & Préférences'}
        </span>
        {showAccountBadge && (
          <GoogleLoginButton lang={lang} onAdminClick={onAdminClick} align="left" showVisitorMenu />
        )}
      </div>

      {showOficina && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            toggleSettings();
          }}
          className="flex items-center justify-between gap-2 px-2.5 py-2 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>A Oficina</span>
          </span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono border border-current opacity-75">
            O
          </kbd>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          onCloseMenu();
          setIsProfileModalOpen(true);
        }}
        className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)] cursor-pointer transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isPt ? 'Meu Perfil & Preferências' : 'Mon Profil & Préférences'}</span>
      </button>
    </div>
  );
};
