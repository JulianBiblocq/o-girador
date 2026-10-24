import React, { useState } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useTransportStore } from '../stores/useTransportStore';
import { GlobalSwingModal } from './GlobalSwingModal';
import { Cloud } from 'lucide-react';
import { getActiveCloudPresetId } from '../utils/cloudPresetState';
import { CordelContextMenu } from './ui/CordelContextMenu';
import { HeaderBrand } from './header/HeaderBrand';
import { UndoIcon, RedoIcon } from './header/HeaderIcons';
import { HeaderMobileMenu } from './header/HeaderMobileMenu';
import { HeaderDesktopMenu } from './header/HeaderDesktopMenu';
import { HeaderViewSwitcher } from './header/HeaderViewSwitcher';
import { HeaderAuxiliaryControls } from './header/HeaderAuxiliaryControls';
import { HeaderMobileQuickActions } from './header/HeaderMobileQuickActions';
import { useHeaderTabMenu } from './header/useHeaderTabMenu';
import { useHeaderProject } from './header/useHeaderProject';
import { HeaderProps } from './header/headerTypes';

export type { HeaderProps };

const HeaderComponent: React.FC<HeaderProps> = (props) => {
  const { lang, setLang, handleUndo, handleRedo } = useSequencer();
  const { activePresetName: preset, handlePresetSelect } = useAudio();
  const [isSwingModalOpen, setIsSwingModalOpen] = useState(false);

  const canUndo = useSequencerStore((s) => s.tracksHistory.length > 0);
  const canRedo = useSequencerStore((s) => s.tracksRedoHistory.length > 0);
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode);
  const metadata = useSequencerStore((s) => s.metadata);
  const storeEditingTrackId = useSequencerStore((s) => s.editingTrackId);
  const isInstrumentEditorDetached = useSequencerStore((s) => s.isInstrumentEditorDetached);
  const isEditorOpen = storeEditingTrackId !== null && !isInstrumentEditorDetached;

  const globalSwing = useTransportStore((s) => s.globalSwing);
  const setGlobalSwing = useTransportStore((s) => s.setGlobalSwing);

  const { tabContextMenu, setTabContextMenu, createTabTouchHandlers, getTabMenuItems } =
    useHeaderTabMenu(lang, props.onToggleDetachInstrumentEditor);

  const project = useHeaderProject(props.cloudPresets, preset);
  const onLangToggle = () => setLang(lang === 'pt' ? 'fr' : 'pt');

  const sharedProjectProps = {
    lang,
    preset,
    songTitle: metadata?.toada,
    publicCloudPresets: project.publicCloudPresets,
    privateCloudPresets: project.privateCloudPresets,
    localPresets: props.localPresets || [],
    isCloudPresetsLoading: Boolean(props.isCloudPresetsLoading),
    showGroupCatalogue: project.showGroupCatalogue,
    groupLabel: project.groupLabel,
    groupLogo: '/Pictures/logo-samambaia.png',
    defaultPresetId: project.groupDefaultPresetId,
    canSetDefaultPreset: project.canSetDefaultPreset,
    canEdit: project.isEditor,
    onSetDefaultPreset: project.handleSetDefaultPreset,
    onToggleDraft: project.handleToggleDraft,
    onPresetChange: handlePresetSelect,
    onExportTablature: props.onExportTablature,
    onOpenPaperWorkshop: props.onOpenPaperWorkshop,
    onCloudSave: props.onCloudSave,
    onOpenSwingModal: () => setIsSwingModalOpen(true),
    onToggleRightPanel: props.onToggleRightPanel,
    onViewModeToggle: props.onViewModeToggle,
    onOpenWallpaperModal: props.onOpenWallpaperModal,
    onAdminClick: props.onAdminClick,
  };

  if (props.isMobile) {
    return (
      <div id="top-bar" className="w-full h-[56px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex items-center justify-between px-2.5 sm:px-4 z-[250] relative select-none shrink-0">
        <HeaderMobileMenu
          {...sharedProjectProps}
          isDarkMode={props.isDarkMode}
          onToggleDarkMode={props.onToggleDarkMode}
          onLangToggle={onLangToggle}
          showInstallButton={props.showInstallButton}
          onInstallClick={props.onInstallClick}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          mobileTab={props.mobileTab}
          onMobileTabToggle={props.onMobileTabToggle}
          activeRightPanel={props.activeRightPanel}
        />
        <div className="min-w-0 flex-1 overflow-hidden mx-1 sm:mx-2 flex items-center justify-start">
          <button
            type="button"
            onClick={props.onCloudSave}
            className="flex items-center gap-1.5 px-2 py-1 bg-[var(--cordel-surface)] border border-[var(--cordel-border)] font-cactus font-bold text-[11px] max-w-full text-[var(--cordel-text)] shadow-xs hover:border-[#8b2a1a] cursor-pointer min-w-0"
            title={Boolean(getActiveCloudPresetId()) ? (lang === 'fr' ? 'Mettre à jour le morceau' : 'Atualizar música') : (lang === 'fr' ? 'Sauvegarder le morceau' : 'Salvar música')}
          >
            <Cloud size={13} className={Boolean(getActiveCloudPresetId()) ? "text-[#15803d] shrink-0" : "text-[#8b2a1a] shrink-0"} />
            <span className="truncate">{metadata?.toada || preset || (lang === 'fr' ? 'Nouveau morceau' : 'Nova música')}</span>
          </button>
        </div>
        <HeaderBrand version={props.version} isMobile />
        <HeaderMobileQuickActions
          lang={lang}
          viewMode={props.viewMode}
          mobileTab={props.mobileTab || 'roda'}
          onViewModeToggle={props.onViewModeToggle}
          onMobileTabToggle={props.onMobileTabToggle}
          isEditorOpen={isEditorOpen}
        />
        {isSwingModalOpen && (
          <GlobalSwingModal globalSwing={globalSwing} setGlobalSwing={setGlobalSwing} onClose={() => setIsSwingModalOpen(false)} lang={lang} />
        )}
      </div>
    );
  }

  return (
    <div id="top-bar" className="w-full min-h-[70px] bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] flex flex-wrap items-center justify-between px-5 py-2.5 gap-2 z-[250] relative select-none shrink-0">
      <div className="flex-1 flex items-center gap-3">
        <HeaderBrand version={props.version} />
        <HeaderDesktopMenu {...sharedProjectProps} />
        {!isPracticeMode && (
          <div className="inline-flex items-center rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] ml-1.5 shrink-0">
            <button type="button" onClick={handleUndo} disabled={!canUndo} className="w-8 h-8 flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-2 border-r border-[#1a1a1a] transition-colors" title={lang === 'pt' ? 'Desfazer (Ctrl+Z)' : 'Annuler (Ctrl+Z)'}>
              <UndoIcon className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleRedo} disabled={!canRedo} className="w-8 h-8 flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-2 border-l-0 border-[#1a1a1a] transition-colors" title={lang === 'pt' ? 'Refazer (Ctrl+Y)' : 'Rétablir (Ctrl+Y)'}>
              <RedoIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <HeaderViewSwitcher lang={lang} viewMode={props.viewMode} onViewModeToggle={props.onViewModeToggle} isEditorOpen={isEditorOpen} createTabTouchHandlers={createTabTouchHandlers} onOpenInstrumentEditor={props.onOpenInstrumentEditor} />
      <HeaderAuxiliaryControls lang={lang} isDarkMode={props.isDarkMode} onToggleDarkMode={props.onToggleDarkMode} onLangToggle={onLangToggle} showInstallButton={props.showInstallButton} onInstallClick={props.onInstallClick} onOpenWallpaperModal={props.onOpenWallpaperModal} />
      {isSwingModalOpen && (
        <GlobalSwingModal globalSwing={globalSwing} setGlobalSwing={setGlobalSwing} onClose={() => setIsSwingModalOpen(false)} lang={lang} />
      )}
      {tabContextMenu && (
        <CordelContextMenu x={tabContextMenu.x} y={tabContextMenu.y} title={tabContextMenu.title} items={getTabMenuItems()} onClose={() => setTabContextMenu(null)} />
      )}
    </div>
  );
};

export const Header = React.memo(HeaderComponent);
