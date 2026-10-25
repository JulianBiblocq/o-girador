import React, { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useCatalogPresetDeletion } from '../hooks/useCatalogPresetDeletion';
import { PresetAccordionSection } from './preset-accordion/PresetAccordionSection';
import { PresetAccordionLocalSection } from './preset-accordion/PresetAccordionLocalSection';
import { PresetAccordionDraftsSection } from './preset-accordion/PresetAccordionDraftsSection';
import { PresetAccordionSelectFallback } from './preset-accordion/PresetAccordionSelectFallback';
import { PresetAccordionHeader } from './preset-accordion/PresetAccordionHeader';
import { PresetAccordionSelectorProps } from './preset-accordion/presetAccordionTypes';

export type { PresetAccordionSelectorProps };

export const PresetAccordionSelector: React.FC<PresetAccordionSelectorProps> = ({
  lang,
  activePreset,
  currentSongTitle,
  publicCloudPresets = [],
  privateCloudPresets = [],
  localPresets = [],
  isCloudPresetsLoading = false,
  showGroupCatalogue = false,
  groupLabel,
  groupLogo,
  defaultPresetId = null,
  canSetDefaultPreset = false,
  onSetDefaultPreset,
  canEdit = false,
  onToggleDraft,
  onSelectPreset,
  className = '',
}) => {
  const audio = useAudio();
  const { canDeletePreset, handleDeletePreset } = useCatalogPresetDeletion(lang, canEdit);
  const [isGroupOpen, setIsGroupOpen] = useState(showGroupCatalogue);
  const [isPublicOpen, setIsPublicOpen] = useState(!showGroupCatalogue);

  useEffect(() => {
    setIsGroupOpen(showGroupCatalogue);
    setIsPublicOpen(!showGroupCatalogue);
  }, [showGroupCatalogue]);

  const handleItemClick = (val: string, cloudId?: string) => {
    if (cloudId && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('loadPreset', cloudId);
        window.history.replaceState(null, '', url.toString());
      } catch (_) {}
    }
    onSelectPreset(val, cloudId);
  };

  const groupTitle = lang === 'pt' ? `Catálogo ${groupLabel || 'do Grupo'}` : `Catalogue ${groupLabel || 'du Groupe'}`;
  const publicTitle = lang === 'pt' ? 'Catálogo Público' : 'Catalogue Public';
  const isItemActive = (val: string, name: string): boolean =>
    Boolean(activePreset === val || (currentSongTitle && currentSongTitle.trim().toLowerCase() === name.trim().toLowerCase()));
  const visiblePrivate = canEdit ? privateCloudPresets : privateCloudPresets.filter((p) => p.isDraft !== true);
  const visiblePublic = canEdit ? publicCloudPresets : publicCloudPresets.filter((p) => p.isDraft !== true);

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <PresetAccordionHeader lang={lang} currentSongTitle={currentSongTitle} />
      <div className="flex flex-col gap-1.5 w-full">
        {showGroupCatalogue && (
          <PresetAccordionSection
            testId="group-catalog-samambaia"
            isOpen={isGroupOpen}
            onToggle={() => setIsGroupOpen((prev) => !prev)}
            title={groupTitle}
            count={visiblePrivate.length}
            logo={groupLogo || '/o-girador-logo.svg'}
            items={visiblePrivate}
            itemIcon=""
            emptyMsg={lang === 'pt' ? '(Nenhum ritmo no grupo)' : '(Aucun morceau dans le groupe)'}
            isGroupList={true}
            isLoading={isCloudPresetsLoading}
            defaultPresetId={defaultPresetId}
            canEdit={canEdit}
            canSetDefaultPreset={canSetDefaultPreset}
            canDeletePreset={canDeletePreset}
            lang={lang}
            isItemActive={isItemActive}
            onItemClick={handleItemClick}
            onToggleDraft={onToggleDraft}
            onSetDefaultPreset={onSetDefaultPreset}
            onDeletePreset={handleDeletePreset}
          />
        )}

        <PresetAccordionSection
          isOpen={isPublicOpen}
          onToggle={() => setIsPublicOpen((prev) => !prev)}
          title={publicTitle}
          count={visiblePublic.length}
          icon={<Cloud size={13} className="shrink-0 text-[#d99b26]" />}
          items={visiblePublic}
          itemIcon={<Cloud size={11} className="shrink-0 opacity-70" />}
          emptyMsg={lang === 'pt' ? '(Nenhum ritmo público)' : '(Aucun morceau public)'}
          isLoading={isCloudPresetsLoading}
          canDeletePreset={canDeletePreset}
          lang={lang}
          isItemActive={isItemActive}
          onItemClick={handleItemClick}
          onDeletePreset={handleDeletePreset}
        />

        <PresetAccordionLocalSection
          localPresets={localPresets}
          lang={lang}
          isItemActive={isItemActive}
          onItemClick={(name) => handleItemClick(name)}
        />

        <PresetAccordionDraftsSection
          lang={lang}
          onSelectDraft={(presetData, name) => {
            handleItemClick(`draft:${name}`);
            if (audio?.applyPreset) audio.applyPreset(presetData);
          }}
        />
      </div>

      <PresetAccordionSelectFallback
        activePreset={activePreset}
        currentSongTitle={currentSongTitle}
        lang={lang}
        showGroupCatalogue={showGroupCatalogue}
        groupTitle={groupTitle}
        publicTitle={publicTitle}
        visiblePrivate={visiblePrivate}
        visiblePublic={visiblePublic}
        onSelect={handleItemClick}
      />
    </div>
  );
};
