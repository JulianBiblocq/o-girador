import React, { useState, useEffect } from 'react';
import { BookOpen, Music, Cloud } from 'lucide-react';
import { PresetAccordionSection } from './preset-accordion/PresetAccordionSection';
import { PresetAccordionLocalSection } from './preset-accordion/PresetAccordionLocalSection';
import { PresetAccordionSelectFallback } from './preset-accordion/PresetAccordionSelectFallback';

export interface PresetAccordionSelectorProps {
  lang: 'pt' | 'fr';
  activePreset: string;
  currentSongTitle?: string;
  publicCloudPresets: Array<{ id: string; name: string; visibility?: string; isDraft?: boolean }>;
  privateCloudPresets: Array<{ id: string; name: string; visibility?: string; isDraft?: boolean }>;
  localPresets?: string[];
  isCloudPresetsLoading: boolean;
  showGroupCatalogue: boolean;
  groupLabel: string | null;
  groupLogo?: string | null;
  defaultPresetId?: string | null;
  canSetDefaultPreset?: boolean;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  canEdit?: boolean;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSelectPreset: (presetValue: string, cloudId?: string) => void;
  className?: string;
}

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
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen size={12} className="shrink-0 text-[#d99b26]" />
          <span>{lang === 'pt' ? 'Catálogo de Ritmos' : 'Catalogue des Morceaux'}</span>
        </span>
        {currentSongTitle && (
          <span className="text-[11px] font-cactus font-bold text-[var(--cordel-text)] truncate flex items-center gap-1">
            <Music size={11} className="shrink-0 text-[var(--cordel-wood)]" />
            <span className="truncate">{currentSongTitle}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {showGroupCatalogue && (
          <PresetAccordionSection
            testId="group-catalog-samambaia"
            isOpen={isGroupOpen}
            onToggle={() => setIsGroupOpen((prev) => !prev)}
            title={groupTitle}
            count={visiblePrivate.length}
            logo={groupLogo || '/Pictures/logo-samambaia.png'}
            items={visiblePrivate}
            itemIcon=""
            emptyMsg={lang === 'pt' ? '(Nenhum ritmo no grupo)' : '(Aucun morceau dans le groupe)'}
            isGroupList={true}
            isLoading={isCloudPresetsLoading}
            defaultPresetId={defaultPresetId}
            canEdit={canEdit}
            canSetDefaultPreset={canSetDefaultPreset}
            lang={lang}
            isItemActive={isItemActive}
            onItemClick={handleItemClick}
            onToggleDraft={onToggleDraft}
            onSetDefaultPreset={onSetDefaultPreset}
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
          lang={lang}
          isItemActive={isItemActive}
          onItemClick={handleItemClick}
        />

        <PresetAccordionLocalSection
          localPresets={localPresets}
          lang={lang}
          isItemActive={isItemActive}
          onItemClick={(name) => handleItemClick(name)}
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
