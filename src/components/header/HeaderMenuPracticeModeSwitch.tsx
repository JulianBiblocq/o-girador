
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
  const mobileViewMode = useSequencerStore((s) => s.mobileViewMode);
  const setMobileViewMode = useSequencerStore((s) => s.setMobileViewMode);
  const { userProfile, isAdmin } = useAuth();

  const isPracticeActive = isPracticeMode;
  const isStudioActive = !isPracticeMode;

  const handleSelectPractice = () => {
    setMobileViewMode('percussion');
    setIsPracticeMode(true);
    if (onViewModeToggle) onViewModeToggle('roda');
    onCloseMenu();
  };

  const handleSelectDanse = () => {
    const metadata = (useSequencerStore.getState().metadata || {}) as any;
    const songId = metadata.morceauId || metadata.songId || metadata.toada || '';
    const toadaId = metadata.toada || '';
    const isPrivileged = userProfile?.role === 'mestre' || !!userProfile?.mestreId || isAdmin || userProfile?.canWriteSequenciador || userProfile?.isPremium;
    const query = isPrivileged
      ? `?songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`
      : `?mode=eleve&songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`;
    const targetUrl = getEcosystemUrl('dancador', query);
    launchWithSSO(targetUrl, { appLabel: 'Dançador', appKey: 'dancador', forceSameTab: false });
    onCloseMenu();
  };

  const handleSelectChant = () => {
    const metadata = (useSequencerStore.getState().metadata || {}) as any;
    const songId = metadata.morceauId || metadata.songId || metadata.toada || '';
    const toadaId = metadata.toada || '';
    const isPrivileged = userProfile?.role === 'mestre' || !!userProfile?.mestreId || isAdmin || userProfile?.canWriteSequenciador || userProfile?.isPremium;
    const query = isPrivileged
      ? `?songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`
      : `?mode=eleve&songId=${encodeURIComponent(songId)}&toadaId=${encodeURIComponent(toadaId)}`;
    const targetUrl = getEcosystemUrl('vocalLab', query);
    launchWithSSO(targetUrl, { appLabel: 'Cantador', appKey: 'vocalLab', forceSameTab: false });
    onCloseMenu();
  };

  const handleSelectStudio = () => {
    setMobileViewMode('complet');
    setIsPracticeMode(false);
    if (onViewModeToggle) onViewModeToggle('roda');
    onCloseMenu();
  };

  const btnBase = "h-9 px-2 cordel-border-sm flex items-center justify-center gap-1.5 font-cactus font-bold text-[11px] uppercase cursor-pointer transition-colors select-none text-left";

  return (
    <div className="grid grid-cols-2 gap-1.5 w-full">
      {/* 1. Mode Pratique */}
      <button
        type="button"
        onClick={handleSelectPractice}
        className={`${btnBase} ${isPracticeActive ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-inner font-black' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#1a1a1a]/10'}`}
        title={lang === 'pt' ? 'Modo Prática (Percussão)' : 'Mode Pratique (Percussion)'}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2.2]" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
        <span className="truncate">{lang === 'pt' ? 'Prática' : 'Pratique'}</span>
      </button>

      {/* 2. Mode Danse */}
      <button
        type="button"
        onClick={handleSelectDanse}
        className={`${btnBase} bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#1a1a1a]/10`}
        title={lang === 'pt' ? 'Modo Dança (Dançador)' : 'Mode Danse (Dançador)'}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18l5-2 3 4 5-8 3 2" /><circle cx="17" cy="5" r="2" />
        </svg>
        <span className="truncate">{lang === 'pt' ? 'Dança' : 'Danse'}</span>
      </button>

      {/* 3. Mode Chant */}
      <button
        type="button"
        onClick={handleSelectChant}
        className={`${btnBase} bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#1a1a1a]/10`}
        title={lang === 'pt' ? 'Modo Canto (Cantador)' : 'Mode Chant (Cantador)'}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        <span className="truncate">{lang === 'pt' ? 'Canto' : 'Chant'}</span>
      </button>

      {/* 4. Mode Studio */}
      <button
        type="button"
        onClick={handleSelectStudio}
        className={`${btnBase} ${isStudioActive ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-inner font-black' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[#1a1a1a]/10'}`}
        title={lang === 'pt' ? 'Modo Estúdio (DAW completa)' : 'Mode Studio (DAW complète)'}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span className="truncate">{lang === 'pt' ? 'Estúdio' : 'Studio'}</span>
      </button>
    </div>
  );
};
