import React from 'react';
import { Settings } from 'lucide-react';
import { XiloRoda, XiloConsole, XiloTimeline, XiloDrum } from '../XiloIcons';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

interface HeaderMobileQuickActionsProps {
  lang: 'pt' | 'fr';
  viewMode: string;
  mobileTab: 'roda' | 'mixer' | 'toada';
  onViewModeToggle: (mode: any) => void;
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  isEditorOpen: boolean;
}

export const HeaderMobileQuickActions: React.FC<HeaderMobileQuickActionsProps> = ({
  lang,
  viewMode,
  mobileTab,
  onViewModeToggle,
  onMobileTabToggle,
  isEditorOpen,
}) => {
  const isTracksCollapsed = useSequencerStore((state) => state.isTracksCollapsed);
  const toggleSettings = useSequencerSettingsStore((state) => state.toggleSettings);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* TÉLÉCOMMANDE RÉPÉTITION */}
      <button
        onClick={() => {
          useSequencerStore.getState().closeDetailEditor();
          useSequencerStore.getState().setIsMobileStudioMode(false);
        }}
        className="px-2 h-9 flex items-center justify-center font-cactus font-bold text-xs uppercase cordel-border-sm cordel-button cursor-pointer bg-[#b94a2c] text-[#f4ecd8] shadow-[2px_2px_0_#000]"
        title="Retour Télécommande Répétition"
      >
        RÉPÉTITION
      </button>

      {/* RODA */}
      <button
        onClick={() => {
          useSequencerStore.getState().closeDetailEditor();
          onViewModeToggle('roda');
          if (onMobileTabToggle) onMobileTabToggle('roda');
          useSequencerStore.setState({ isTracksCollapsed: true });
        }}
        className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
          !isEditorOpen && viewMode === 'roda' && mobileTab === 'roda' && isTracksCollapsed
            ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
        title="Roda"
      >
        <XiloRoda size={16} />
      </button>

      {/* MIXADOR (TRACK MIXER / DAW LINEAIRE) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          useSequencerStore.getState().closeDetailEditor();
          onViewModeToggle('roda');
          if (onMobileTabToggle) onMobileTabToggle('mixer');
          useSequencerStore.setState({ isTracksCollapsed: false });
        }}
        className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
          !isEditorOpen && viewMode === 'roda' && (mobileTab === 'mixer' || !isTracksCollapsed)
            ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
        title={lang === 'fr' ? 'Pistes / Séquenceur' : 'Pistas / Sequenciador'}
      >
        <XiloDrum size={16} />
      </button>

      {/* CONSOLE */}
      <button
        onClick={() => {
          useSequencerStore.getState().closeDetailEditor();
          onViewModeToggle('console');
        }}
        className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
          !isEditorOpen && viewMode === 'console'
            ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
        title="Console"
      >
        <XiloConsole size={16} />
      </button>

      {/* TIMELINE */}
      <button
        onClick={() => {
          useSequencerStore.getState().closeDetailEditor();
          onViewModeToggle('timeline');
        }}
        className={`w-9 h-9 flex items-center justify-center font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
          !isEditorOpen && viewMode === 'timeline'
            ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
        title={lang === 'fr' ? 'Séquenceur' : 'Sequenciador'}
      >
        <XiloTimeline size={16} />
      </button>

      {/* ATELIER (OFICINA) */}
      <button
        onClick={toggleSettings}
        className="w-9 h-9 flex items-center justify-center font-bold text-sm cordel-border-sm cordel-button cursor-pointer bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
        title={lang === 'pt' ? 'A Oficina (Configurações) [O]' : "L'Atelier (Paramètres) [O]"}
      >
        <Settings size={15} />
      </button>
    </div>
  );
};
