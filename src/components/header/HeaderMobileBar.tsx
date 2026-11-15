import React from 'react';
import { Cloud } from 'lucide-react';
import { getActiveCloudPresetId } from '../../utils/cloudPresetState';
import { HeaderBrand } from './HeaderBrand';
import { HeaderMobileMenu } from './HeaderMobileMenu';
import { HeaderMobileQuickActions } from './HeaderMobileQuickActions';
import { HeaderProps } from './headerTypes';

interface HeaderMobileBarProps {
  props: HeaderProps;
  sharedProjectProps: any;
  onLangToggle: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isEditorOpen: boolean;
  metadata: any;
  preset: string;
  lang: 'fr' | 'pt';
}

export const HeaderMobileBar: React.FC<HeaderMobileBarProps> = ({
  props, sharedProjectProps, onLangToggle, handleUndo, handleRedo,
  canUndo, canRedo, isEditorOpen, metadata, preset, lang,
}) => {
  const hasCloudId = Boolean(getActiveCloudPresetId());
  const saveTitle = hasCloudId
    ? (lang === 'fr' ? 'Mettre à jour le morceau' : 'Atualizar música')
    : (lang === 'fr' ? 'Sauvegarder le morceau' : 'Salvar música');

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
          className="flex items-center gap-1.5 px-2 py-1 bg-[var(--cordel-surface)] border border-[var(--cordel-border)] font-cactus font-bold text-[11px] max-w-full text-[var(--cordel-text)] shadow-xs hover:border-[var(--cordel-accent-readable)] cursor-pointer min-w-0"
          title={saveTitle}
        >
          <Cloud size={13} className={hasCloudId ? 'text-[var(--cordel-status-success)] shrink-0' : 'text-[var(--cordel-accent-readable)] shrink-0'} />
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
    </div>
  );
};
