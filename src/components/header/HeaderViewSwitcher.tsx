import React, { startTransition, useEffect, useState } from 'react';
import { Edit3 } from 'lucide-react';
import { XiloRoda, XiloConsole, XiloTimeline, XiloDrum } from '../XiloIcons';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { switchSatelliteMode } from '../../utils/satelliteCoordinator';
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

function closeDockedEditorOnly(): void {
  const ws = useDesktopWorkspaceStore.getState();
  if (!(ws.isSatelliteOpen && ws.satelliteMode === 'editor')) {
    useSequencerStore.getState().closeDetailEditor();
  }
}

export const HeaderViewSwitcher: React.FC<HeaderViewSwitcherProps> = ({
  lang, viewMode, onViewModeToggle, isEditorOpen, createTabTouchHandlers, onOpenInstrumentEditor,
}) => {
  const isTracksCollapsed = useSequencerStore((state) => state.isTracksCollapsed);
  const isPracticeMode = useSequencerStore((state) => state.isPracticeMode);
  const isSatelliteMixer = useDesktopWorkspaceStore((s) => s.isSatelliteOpen && s.satelliteMode === 'mixer');
  const isSatelliteEditor = useDesktopWorkspaceStore((s) => s.isSatelliteOpen && s.satelliteMode === 'editor');
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  useEffect(() => {
    setPendingTab(null);
  }, [viewMode, isTracksCollapsed, isEditorOpen]);

  const handleOpenEditor = () => {
    if (useDesktopWorkspaceStore.getState().isSatelliteOpen) {
      switchSatelliteMode('editor');
      return;
    }
    setPendingTab(isEditorOpen ? null : 'editor');
    startTransition(() => {
      if (onOpenInstrumentEditor) onOpenInstrumentEditor();
      else {
        const state = useSequencerStore.getState();
        if (state.editingTrackId !== null) state.closeDetailEditor();
        else if (state.tracks.length > 0) state.setEditingTrackId(state.tracks[0].id);
      }
    });
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <HeaderTabButton
        tabKey="roda" label="RODA" icon={<XiloRoda size={14} className="shrink-0" />}
        isActive={pendingTab ? pendingTab === 'roda' : (!isEditorOpen && viewMode === 'roda' && isTracksCollapsed)}
        title={lang === 'fr' ? 'Vue Roda / Séquenceur circulaire' : 'Visão Roda / Sequenciador circular'}
        onClick={() => { setPendingTab('roda'); startTransition(() => { closeDockedEditorOnly(); onViewModeToggle('roda'); useSequencerStore.setState({ isTracksCollapsed: true }); }); }}
        createTabTouchHandlers={createTabTouchHandlers}
      />
      <HeaderTabButton
        tabKey="pistes" label={lang === 'fr' ? 'PISTES' : 'PISTAS'} icon={<XiloDrum size={14} className="shrink-0" />}
        isActive={pendingTab ? pendingTab === 'pistes' : (!isEditorOpen && viewMode === 'roda' && !isTracksCollapsed)}
        title={lang === 'fr' ? 'Vue Pistes / Séquenceur linéaire' : 'Visão Pistas / Sequenciador linear'}
        onClick={(e) => { e.stopPropagation(); setPendingTab('pistes'); startTransition(() => { closeDockedEditorOnly(); onViewModeToggle('roda'); useSequencerStore.setState({ isTracksCollapsed: false }); }); }}
        createTabTouchHandlers={createTabTouchHandlers}
      />
      {!isPracticeMode && (
        <>
          <HeaderTabButton
            tabKey="mixer" label={lang === 'fr' ? 'MIXEUR' : 'MIXADOR'} icon={<XiloConsole size={14} className="shrink-0" />}
            isActive={pendingTab ? pendingTab === 'mixer' : (isSatelliteMixer || (!isEditorOpen && viewMode === 'console'))}
            title={lang === 'pt' ? 'Visão Console / Mixer vertical' : 'Vue Console / Mixeur vertical'}
            onClick={() => {
              if (useDesktopWorkspaceStore.getState().isSatelliteOpen) { switchSatelliteMode('mixer'); return; }
              setPendingTab('mixer');
              startTransition(() => { closeDockedEditorOnly(); onViewModeToggle('console'); });
            }}
            createTabTouchHandlers={createTabTouchHandlers}
          />
          <HeaderTabButton
            tabKey="timeline" label={lang === 'fr' ? 'SÉQUENCEUR' : 'SEQUENCIADOR'} icon={<XiloTimeline size={14} className="shrink-0" />}
            isActive={pendingTab ? pendingTab === 'timeline' : (!isEditorOpen && viewMode === 'timeline')}
            title={lang === 'fr' ? 'Vue Séquenceur / Ligne temporelle' : 'Visualização do Sequenciador / Linha do tempo'}
            onClick={() => { setPendingTab('timeline'); startTransition(() => { closeDockedEditorOnly(); onViewModeToggle('timeline'); }); }}
            createTabTouchHandlers={createTabTouchHandlers}
          />
          <HeaderTabButton
            tabKey="editor" label={lang === 'fr' ? 'ÉDITEUR' : 'EDITOR'} icon={<Edit3 size={14} className="shrink-0" />}
            isActive={pendingTab ? pendingTab === 'editor' : (isEditorOpen || isSatelliteEditor)}
            title={lang === 'fr' ? "Éditeur d'instrument détaillé" : 'Editor de instrumento detalhado'}
            onClick={handleOpenEditor}
            createTabTouchHandlers={createTabTouchHandlers}
          />
        </>
      )}
    </div>
  );
};
