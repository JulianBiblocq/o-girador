import React from 'react';
import { Trash2, FileText, Save, Folder } from 'lucide-react';
import { PresetAccordionSelector } from '../PresetAccordionSelector';
import { BoutonExportDanse } from '../BoutonExportDanse';
import { useAuth } from '../../contexts/AuthContext';
import { useWizardStore } from '../../stores/useWizardStore';
import { i18n } from '../../data';
import { getActiveCloudPresetId } from '../../utils/cloudPresetState';
import type { HeaderProjectDropdownContentProps } from './headerProjectDropdownTypes';

export const HeaderProjectDropdownContent: React.FC<HeaderProjectDropdownContentProps> = ({
  lang,
  preset,
  songTitle,
  publicCloudPresets,
  privateCloudPresets,
  localPresets,
  isCloudPresetsLoading,
  showGroupCatalogue,
  groupLabel,
  groupLogo,
  defaultPresetId,
  canSetDefaultPreset,
  canEdit,
  onSetDefaultPreset,
  onToggleDraft,
  onPresetChange,
  onExportTablature,
  onOpenPaperWorkshop,
  onCloudSave,
  onCloseMenu,
}) => {
  const { isAdmin, userProfile } = useAuth();
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wide flex items-center gap-1">
          <Folder className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Projeto' : 'Projet'}
        </span>
        {groupLabel && (
          <span className="text-[9px] font-cactus font-bold px-2 py-0.5 border border-[#f4ecd8]/40 bg-black/60 text-[#f4ecd8] rounded-xs flex items-center gap-1.5 shadow-xs">
            <span className="w-4 h-4 flex items-center justify-center bg-[#f4ecd8] rounded-xs p-0.5 shrink-0 shadow-xs border border-black/10">
              <img src={groupLogo} alt="" className="w-full h-full object-contain" />
            </span>
            <span>{groupLabel}</span>
          </span>
        )}
      </div>

      <PresetAccordionSelector
        lang={lang}
        activePreset={preset}
        currentSongTitle={songTitle}
        publicCloudPresets={publicCloudPresets}
        privateCloudPresets={privateCloudPresets}
        localPresets={localPresets}
        isCloudPresetsLoading={isCloudPresetsLoading}
        showGroupCatalogue={showGroupCatalogue}
        groupLabel={groupLabel}
        groupLogo={groupLogo}
        defaultPresetId={defaultPresetId}
        canSetDefaultPreset={canSetDefaultPreset}
        onSetDefaultPreset={onSetDefaultPreset}
        canEdit={canEdit}
        onToggleDraft={onToggleDraft}
        onSelectPreset={(val) => {
          onPresetChange(val);
          onCloseMenu();
        }}
        className="mt-1"
      />

      <div className="grid grid-cols-2 gap-1.5 mt-1">
        <button
          onClick={() => {
            useWizardStore.getState().setIntroModalOpen(true);
            onCloseMenu();
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" /> {t('clear')}
        </button>
        <button
          onClick={() => {
            onExportTablature?.();
            onCloseMenu();
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Tablatura' : 'Tablature'}
        </button>
        <button
          onClick={() => {
            onOpenPaperWorkshop?.();
            onCloseMenu();
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-wood)] hover:text-[#f4ecd8] cursor-pointer text-left w-full col-span-2 mt-1"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Atelier Papel' : 'Atelier Papier'}
        </button>
        <button
          onClick={() => {
            onCloudSave?.();
            onCloseMenu();
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full col-span-2 mt-1 border-none transition-colors"
        >
          <Save className="w-3.5 h-3.5 shrink-0" /> {Boolean(getActiveCloudPresetId()) ? (lang === 'pt' ? 'Atualizar música' : 'Mettre à jour le morceau') : (lang === 'pt' ? 'Salvar música' : 'Sauvegarder le morceau')}
        </button>
        {(isAdmin || userProfile?.role === 'mestre') && (
          <div className="col-span-2 mt-1">
            <BoutonExportDanse />
          </div>
        )}
      </div>
    </div>
  );
};
