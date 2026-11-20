import React from 'react';
import { Trash2, FileText, Save, Folder } from 'lucide-react';
import { PresetAccordionSelector } from '../PresetAccordionSelector';
import { BoutonExportDanse } from '../BoutonExportDanse';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useWizardStore } from '../../stores/useWizardStore';
import { i18n } from '../../data';
import { getActiveCloudPresetId } from '../../utils/cloudPresetState';
import { canMutatePreset, isMestreOrAdminProfile } from '../../utils/presetPermissions';
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
  canToggleDraftPreset,
  onSetDefaultPreset,
  onToggleDraft,
  onPresetChange,
  onExportTablature,
  onOpenPaperWorkshop,
  onCloudSave,
  onCloseMenu,
  isMobileMenu = false,
}) => {
  const { userProfile } = useAuth();
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode);
  const showStudioActions = !isPracticeMode || isMobileMenu;
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const activeCloudId = getActiveCloudPresetId();
  const activeCloudPreset = activeCloudId
    ? [...privateCloudPresets, ...publicCloudPresets].find((p) => p.id === activeCloudId)
    : undefined;
  const canUpdateActivePreset = Boolean(activeCloudId && activeCloudPreset && canMutatePreset(activeCloudPreset, userProfile));
  const isMestreOrAdmin = isMestreOrAdminProfile(userProfile);

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide flex items-center gap-1 font-cactus">
          <Folder className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'pt' ? 'Repertório & Música' : 'Répertoire & Morceau'}</span>
        </span>
        {groupLabel && (
          <span className="text-[9px] font-cactus font-bold px-2 py-0.5 border border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] flex items-center gap-1.5">
            {groupLogo && (
              <span className="w-4 h-4 flex items-center justify-center bg-[var(--cordel-paper-surface)] p-0.5 shrink-0">
                <img src={groupLogo} alt="" className="w-full h-full object-contain" />
              </span>
            )}
            <span className="truncate max-w-[100px]">{groupLabel}</span>
          </span>
        )}
      </div>

      <PresetAccordionSelector
        lang={lang} activePreset={preset} currentSongTitle={songTitle}
        publicCloudPresets={publicCloudPresets} privateCloudPresets={privateCloudPresets}
        localPresets={localPresets} isCloudPresetsLoading={isCloudPresetsLoading}
        showGroupCatalogue={showGroupCatalogue} groupLabel={groupLabel} groupLogo={groupLogo}
        defaultPresetId={defaultPresetId} canSetDefaultPreset={canSetDefaultPreset}
        onSetDefaultPreset={onSetDefaultPreset} canEdit={canEdit}
        canToggleDraftPreset={canToggleDraftPreset} onToggleDraft={onToggleDraft}
        onSelectPreset={(val) => { onPresetChange(val); onCloseMenu(); }}
        className="mt-0.5"
      />

      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
        {showStudioActions && (
          <button
            type="button"
            onClick={() => { useWizardStore.getState().setIntroModalOpen(true); onCloseMenu(); }}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer text-left w-full"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{t('clear')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => { onExportTablature?.(); onCloseMenu(); }}
          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-[11px] font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer w-full ${showStudioActions ? '' : 'col-span-2'}`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lang === 'pt' ? 'Tablatura / Partitura' : 'Tablature / Partition'}</span>
        </button>

        {isMobileMenu && onOpenPaperWorkshop && (
          <button
            type="button"
            onClick={() => { onOpenPaperWorkshop(); onCloseMenu(); }}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-[11px] font-bold font-cactus hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer text-left w-full col-span-2"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" /> <span>{lang === 'pt' ? 'Atelier Papel' : 'Atelier Papier'}</span>
          </button>
        )}

        {showStudioActions && (
          <button
            type="button"
            onClick={() => { onCloudSave?.(); onCloseMenu(); }}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] text-[11px] font-bold font-cactus cursor-pointer w-full col-span-2 shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)] transition-colors"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {canUpdateActivePreset
                ? (lang === 'pt' ? 'Atualizar música' : 'Mettre à jour le morceau')
                : (lang === 'pt' ? 'Salvar música' : 'Sauvegarder le morceau')}
            </span>
          </button>
        )}

        {showStudioActions && isMestreOrAdmin && (
          <div className="col-span-2 mt-0.5">
            <BoutonExportDanse />
          </div>
        )}
      </div>
    </div>
  );
};
