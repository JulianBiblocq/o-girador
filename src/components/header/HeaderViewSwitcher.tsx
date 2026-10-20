import React from 'react';
import { Edit3 } from 'lucide-react';
import { XiloRoda, XiloConsole, XiloTimeline, XiloDrum } from '../XiloIcons';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { TabKey } from './useHeaderTabMenu';

interface HeaderViewSwitcherProps {
  lang: 'pt' | 'fr';
  viewMode: string;
  onViewModeToggle: (mode: any) => void;
  isEditorOpen: boolean;
  createTabTouchHandlers: (tabKey: TabKey, title: string) => any;
  onOpenInstrumentEditor?: () => void;
}

export const HeaderViewSwitcher: React.FC<HeaderViewSwitcherProps> = ({
  lang,
  viewMode,
  onViewModeToggle,
  isEditorOpen,
  createTabTouchHandlers,
  onOpenInstrumentEditor,
}) => {
  const isTracksCollapsed = useSequencerStore((state) => state.isTracksCollapsed);

  return (
    <div className="flex items-center justify-center gap-4">
      {/* RODA */}
      <div
        {...createTabTouchHandlers('roda', 'RODA')}
        className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
      >
        <button
          onClick={() => {
            useSequencerStore.getState().closeDetailEditor();
            onViewModeToggle('roda');
            useSequencerStore.setState({ isTracksCollapsed: true });
          }}
          className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
            !isEditorOpen && viewMode === 'roda' && isTracksCollapsed
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'fr' ? 'Vue Roda / Séquenceur circulaire' : 'Visão Roda / Sequenciador circular'}
        >
          <XiloRoda size={14} className="shrink-0" /> RODA
        </button>
      </div>

      {/* PISTES / DAW LINEAIRE */}
      <div
        {...createTabTouchHandlers('pistes', lang === 'fr' ? 'PISTES' : 'PISTAS')}
        className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            useSequencerStore.getState().closeDetailEditor();
            onViewModeToggle('roda');
            useSequencerStore.setState({ isTracksCollapsed: false });
          }}
          className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
            !isEditorOpen && viewMode === 'roda' && !isTracksCollapsed
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'fr' ? 'Vue Pistes / Séquenceur linéaire' : 'Visão Pistas / Sequenciador linear'}
        >
          <XiloDrum size={14} className="shrink-0" /> {lang === 'fr' ? 'PISTES' : 'PISTAS'}
        </button>
      </div>

      {/* MIXER */}
      <div
        {...createTabTouchHandlers('mixer', lang === 'fr' ? 'MIXEUR' : 'MIXADOR')}
        className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
      >
        <button
          onClick={() => {
            useSequencerStore.getState().closeDetailEditor();
            onViewModeToggle('console');
          }}
          className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
            !isEditorOpen && viewMode === 'console'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'pt' ? 'Visão Console / Mixer vertical' : 'Vue Console / Mixeur vertical'}
        >
          <XiloConsole size={14} className="shrink-0" /> {lang === 'fr' ? 'MIXEUR' : 'MIXADOR'}
        </button>
      </div>

      {/* TIMELINE */}
      <div
        {...createTabTouchHandlers('timeline', lang === 'fr' ? 'SÉQUENCEUR' : 'SEQUENCIADOR')}
        className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
      >
        <button
          onClick={() => {
            useSequencerStore.getState().closeDetailEditor();
            onViewModeToggle('timeline');
          }}
          className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
            !isEditorOpen && viewMode === 'timeline'
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'fr' ? 'Vue Séquenceur / Ligne temporelle' : 'Visualização do Sequenciador / Linha do tempo'}
        >
          <XiloTimeline size={14} className="shrink-0" /> {lang === 'fr' ? 'SÉQUENCEUR' : 'SEQUENCIADOR'}
        </button>
      </div>

      {/* ÉDITEUR */}
      <div
        {...createTabTouchHandlers('editor', lang === 'fr' ? 'ÉDITEUR' : 'EDITOR')}
        className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
      >
        <button
          onClick={() => {
            if (onOpenInstrumentEditor) {
              onOpenInstrumentEditor();
            } else {
              const state = useSequencerStore.getState();
              if (state.editingTrackId !== null) {
                state.closeDetailEditor();
              } else if (state.tracks.length > 0) {
                state.setEditingTrackId(state.tracks[0].id);
              }
            }
          }}
          className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
            isEditorOpen
              ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
          }`}
          title={lang === 'fr' ? "Éditeur d'instrument détaillé" : "Editor de instrumento detalhado"}
        >
          <Edit3 size={14} className="shrink-0" /> {lang === 'fr' ? 'ÉDITEUR' : 'EDITOR'}
        </button>
      </div>
    </div>
  );
};
