import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAuth } from '../../contexts/AuthContext';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { launchWithSSO } from '../../utils/crossAppAuth';

interface HeaderMenuPracticeModeSwitchProps {
  lang: 'pt' | 'fr';
  onViewModeToggle?: (mode: string) => void;
  onCloseMenu: () => void;
}

export const HeaderMenuPracticeModeSwitch: React.FC<HeaderMenuPracticeModeSwitchProps> = ({
  lang,
  onViewModeToggle,
  onCloseMenu,
}) => {
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode);
  const setIsPracticeMode = useSequencerStore((s) => s.setIsPracticeMode);
  const setMobileViewMode = useSequencerStore((s) => s.setMobileViewMode);
  const { userProfile, isAdmin } = useAuth();
  const isPt = lang === 'pt';

  const handleSelectPractice = () => {
    setMobileViewMode('percussion');
    setIsPracticeMode(true);
    if (onViewModeToggle) onViewModeToggle('roda');
    onCloseMenu();
  };

  const handleSelectStudio = () => {
    setMobileViewMode('complet');
    setIsPracticeMode(false);
    if (onViewModeToggle) onViewModeToggle('roda');
    onCloseMenu();
  };

  const buildCrossAppQuery = () => {
    const metadata = (useSequencerStore.getState().metadata || {}) as any;
    const songId = metadata.morceauId || metadata.songId || metadata.toada || '';
    const toadaId = metadata.toada || '';
    const isPrivileged = userProfile?.role === 'mestre' || !!userProfile?.mestreId || isAdmin || userProfile?.canWriteSequenciador || userProfile?.isPremium;
    return isPrivileged
      ? `?songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`
      : `?mode=eleve&songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`;
  };

  const handleSelectDanse = () => {
    launchWithSSO(getEcosystemUrl('dancador', buildCrossAppQuery()), { appLabel: 'Dançador', appKey: 'dancador', forceSameTab: false });
    onCloseMenu();
  };

  const handleSelectCantador = () => {
    launchWithSSO(getEcosystemUrl('vocalLab', buildCrossAppQuery()), { appLabel: 'Cantador', appKey: 'vocalLab', forceSameTab: false });
    onCloseMenu();
  };

  const btnBase = 'h-9 px-2 border-2 flex items-center justify-center gap-1.5 font-cactus font-bold text-[11px] uppercase cursor-pointer transition-colors select-none';
  const activeCls = 'border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)]';
  const idleCls = 'border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]';

  return (
    <div className="grid grid-cols-2 gap-1.5 w-full">
      <button type="button" onClick={handleSelectPractice} className={`${btnBase} ${isPracticeMode ? activeCls : idleCls}`} title={isPt ? 'Modo Prática' : 'Mode Pratique'}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2.2]" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
        <span className="truncate">{isPt ? 'Modo Prática' : 'Mode Pratique'}</span>
      </button>

      <button type="button" onClick={handleSelectStudio} className={`${btnBase} ${!isPracticeMode ? activeCls : idleCls}`} title={isPt ? 'Modo Estúdio' : 'Mode Studio'}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span className="truncate">{isPt ? 'Modo Estúdio' : 'Mode Studio'}</span>
      </button>

      <button type="button" onClick={handleSelectDanse} className={`${btnBase} ${idleCls}`} title="Dançador">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18l5-2 3 4 5-8 3 2" /><circle cx="17" cy="5" r="2" />
        </svg>
        <span className="truncate">{isPt ? 'Modo Dança' : 'Mode Danse'}</span>
      </button>

      <button type="button" onClick={handleSelectCantador} className={`${btnBase} ${idleCls}`} title="Cantador">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        <span className="truncate">Cantador</span>
      </button>
    </div>
  );
};
