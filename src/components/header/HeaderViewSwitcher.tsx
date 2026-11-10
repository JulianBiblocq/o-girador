import React, { startTransition, useEffect, useState } from 'react';
import { Edit3 } from 'lucide-react';
import { XiloRoda, XiloConsole, XiloTimeline, XiloDrum } from '../XiloIcons';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { TabKey } from './useHeaderTabMenu';
import { HeaderTabButton } from './HeaderTabButton';

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
  const isPracticeMode = useSequencerStore((state) => state.isPracticeMode);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  useEffect(() => {
    setPendingTab(null);
  }, [viewMode, isTracksCollapsed, isEditorOpen]);

  const handleOpenEditor = () => {
    setPendingTab(isEditorOpen ? null : 'editor');
    startTransition(() => {
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
    });
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* RODA */}
      <HeaderTabButton
        tabKey="roda"
        label="RODA"
        icon={<XiloRoda size={14} className="shrink-0" />}
        isActive={pendingTab ? pendingTab === 'roda' : (!isEditorOpen && viewMode === 'roda' && isTracksCollapsed)}
        title={lang === 'fr' ? 'Vue Roda / Séquenceur circulaire' : 'Visão Roda / Sequenciador circular'}
        onClick={() => {
          setPendingTab('roda');
          startTransition(() => {
            useSequencerStore.getState().closeDetailEditor();
            onViewModeToggle('roda');
            useSequencerStore.setState({ isTracksCollapsed: true });
          });
        }}
        createTabTouchHandlers={createTabTouchHandlers}
      />

      {/* PISTES / DAW LINEAIRE */}
      <HeaderTabButton
        tabKey="pistes"
        label={lang === 'fr' ? 'PISTES' : 'PISTAS'}
        icon={<XiloDrum size={14} className="shrink-0" />}
        isActive={pendingTab ? pendingTab === 'pistes' : (!isEditorOpen && viewMode === 'roda' && !isTracksCollapsed)}
        title={lang === 'fr' ? 'Vue Pistes / Séquenceur linéaire' : 'Visão Pistas / Sequenciador linear'}
        onClick={(e) => {
          e.stopPropagation();
          setPendingTab('pistes');
          startTransition(() => {
            useSequencerStore.getState().closeDetailEditor();
            onViewModeToggle('roda');
            useSequencerStore.setState({ isTracksCollapsed: false });
          });
        }}
        createTabTouchHandlers={createTabTouchHandlers}
      />

      {/* ONGLETS MASQUÉS EN MODE PRATIQUE */}
      {!isPracticeMode && (
        <>
          {/* MIXER */}
          <HeaderTabButton
            tabKey="mixer"
            label={lang === 'fr' ? 'MIXEUR' : 'MIXADOR'}
            icon={<XiloConsole size={14} className="shrink-0" />}
            isActive={pendingTab ? pendingTab === 'mixer' : (!isEditorOpen && viewMode === 'console')}
            title={lang === 'pt' ? 'Visão Console / Mixer vertical' : 'Vue Console / Mixeur vertical'}
            onClick={() => {
              setPendingTab('mixer');
              startTransition(() => {
                useSequencerStore.getState().closeDetailEditor();
                onViewModeToggle('console');
              });
            }}
            createTabTouchHandlers={createTabTouchHandlers}
          />

          {/* TIMELINE */}
          <HeaderTabButton
            tabKey="timeline"
            label={lang === 'fr' ? 'SÉQUENCEUR' : 'SEQUENCIADOR'}
            icon={<XiloTimeline size={14} className="shrink-0" />}
            isActive={pendingTab ? pendingTab === 'timeline' : (!isEditorOpen && viewMode === 'timeline')}
            title={lang === 'fr' ? 'Vue Séquenceur / Ligne temporelle' : 'Visualização do Sequenciador / Linha do tempo'}
            onClick={() => {
              setPendingTab('timeline');
              startTransition(() => {
                useSequencerStore.getState().closeDetailEditor();
                onViewModeToggle('timeline');
              });
            }}
            createTabTouchHandlers={createTabTouchHandlers}
          />

          {/* ÉDITEUR */}
          <HeaderTabButton
            tabKey="editor"
            label={lang === 'fr' ? 'ÉDITEUR' : 'EDITOR'}
            icon={<Edit3 size={14} className="shrink-0" />}
            isActive={pendingTab ? pendingTab === 'editor' : isEditorOpen}
            title={lang === 'fr' ? "Éditeur d'instrument détaillé" : 'Editor de instrumento detalhado'}
            onClick={handleOpenEditor}
            createTabTouchHandlers={createTabTouchHandlers}
          />
        </>
      )}
    </div>
  );
};
