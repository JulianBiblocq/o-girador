import React from 'react';
import { Cloud, FileText } from 'lucide-react';
import { XiloLock, XiloStar } from '../XiloIcons';
import { PresetAccordionSection } from './PresetAccordionSection';
import type { CatalogAccordionPresetItem, CatalogThreeTiersResult } from './presetAccordionTiers';

interface PresetAccordionCloudSectionsProps {
  lang: 'pt' | 'fr';
  tiers: CatalogThreeTiersResult;
  showGroupCatalogue: boolean;
  groupTitle: string;
  groupLogo?: string | null;
  defaultPresetId?: string | null;
  isCloudPresetsLoading: boolean;
  isGroupOpen: boolean;
  onToggleGroup: () => void;
  isShowcaseOpen: boolean;
  onToggleShowcaseSection: () => void;
  isCommunityOpen: boolean;
  onToggleCommunity: () => void;
  isPersonalOpen: boolean;
  onTogglePersonal: () => void;
  canAccessCommunityCatalog: boolean;
  maxPrivateCloudPresets: number | null;
  effectiveUid: string | null;
  canEdit: boolean;
  strictCanSetDefault: boolean;
  isSuperAdmin: boolean;
  canToggleDraftItem: (p: { id: string; ownerId?: string }) => boolean;
  canDeletePreset: (p: { id: string; ownerId?: string }) => boolean;
  isItemActive: (val: string, name: string) => boolean;
  onItemClick: (val: string, cloudId?: string) => void;
  onLockedCommunityClick: () => void;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  onDeletePreset: (preset: CatalogAccordionPresetItem) => Promise<void> | void;
  onToggleShowcase: (presetId: string, currentShowcase: boolean) => Promise<void> | void;
}

export const PresetAccordionCloudSections: React.FC<PresetAccordionCloudSectionsProps> = (p) => {
  const showcaseTitle = p.lang === 'pt' ? 'Vitrine de Descoberta' : 'Vitrine Découverte';
  const communityTitle = p.lang === 'pt' ? 'Catálogo Comunitário' : 'Catalogue Communautaire';
  const personalTitle = p.lang === 'pt' ? 'Meus rascunhos na Nuvem' : 'Mes brouillons Cloud';

  return (
    <>
      {p.showGroupCatalogue && (
        <PresetAccordionSection
          testId="group-catalog-samambaia"
          isOpen={p.isGroupOpen} onToggle={p.onToggleGroup}
          title={p.groupTitle} countLabel={String(p.tiers.groupItems.length)} logo={p.groupLogo || '/o-girador-logo.webp'}
          items={p.tiers.groupItems} itemIcon=""
          emptyMsg={p.lang === 'pt' ? '(Nenhuma música no grupo)' : '(Aucun morceau dans le groupe)'}
          isGroupList={true} isLoading={p.isCloudPresetsLoading} defaultPresetId={p.defaultPresetId}
          canEdit={p.canEdit} canSetDefaultPreset={p.strictCanSetDefault} canToggleShowcase={p.isSuperAdmin}
          canToggleDraftPreset={p.canToggleDraftItem} canDeletePreset={p.canDeletePreset} lang={p.lang}
          isItemActive={p.isItemActive} onItemClick={p.onItemClick} onToggleDraft={p.onToggleDraft}
          onSetDefaultPreset={p.onSetDefaultPreset} onDeletePreset={p.onDeletePreset} onToggleShowcase={p.onToggleShowcase}
        />
      )}

      {p.tiers.personalDraftItems.length > 0 && (
        <PresetAccordionSection
          testId="personal-cloud-drafts"
          isOpen={p.isPersonalOpen} onToggle={p.onTogglePersonal}
          title={personalTitle}
          countLabel={p.maxPrivateCloudPresets ? `${p.tiers.personalDraftItems.length}/${p.maxPrivateCloudPresets}` : String(p.tiers.personalDraftItems.length)}
          icon={<FileText size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />}
          items={p.tiers.personalDraftItems} itemIcon={<FileText size={11} className="shrink-0 opacity-70" />}
          emptyMsg="" isLoading={false}
          canDeletePreset={(it) => Boolean(p.effectiveUid && it.ownerId === p.effectiveUid)}
          lang={p.lang} isItemActive={p.isItemActive} onItemClick={p.onItemClick} onDeletePreset={p.onDeletePreset}
        />
      )}

      <PresetAccordionSection
        testId="showcase-catalog-section"
        isOpen={p.isShowcaseOpen} onToggle={p.onToggleShowcaseSection}
        title={showcaseTitle} countLabel={String(p.tiers.showcaseItems.length)}
        icon={<XiloStar size={13} active={true} className="shrink-0 text-[var(--cordel-accent-readable)]" />}
        items={p.tiers.showcaseItems} itemIcon={<XiloStar size={11} active={true} className="shrink-0 opacity-75" />}
        emptyMsg={p.lang === 'pt' ? '(Vitrine vazia)' : '(Vitrine vide)'}
        isLoading={p.isCloudPresetsLoading} canDeletePreset={p.canDeletePreset} canToggleShowcase={p.isSuperAdmin}
        lang={p.lang} isItemActive={p.isItemActive} onItemClick={p.onItemClick}
        onDeletePreset={p.onDeletePreset} onToggleShowcase={p.onToggleShowcase}
      />

      <PresetAccordionSection
        testId="community-catalog-section"
        isOpen={p.isCommunityOpen} onToggle={p.onToggleCommunity}
        title={communityTitle} countLabel={String(p.tiers.communityItems.length)}
        icon={p.canAccessCommunityCatalog
          ? <Cloud size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          : <XiloLock size={13} className="shrink-0 text-[var(--cordel-text-muted)]" />}
        items={p.tiers.communityItems} itemIcon={<Cloud size={11} className="shrink-0 opacity-70" />}
        emptyMsg={p.lang === 'pt' ? '(Nenhuma música comunitária)' : '(Aucun morceau communautaire)'}
        isLockedForUser={!p.canAccessCommunityCatalog}
        isLoading={p.isCloudPresetsLoading} canDeletePreset={p.canDeletePreset} canToggleShowcase={p.isSuperAdmin}
        lang={p.lang} isItemActive={p.isItemActive} onItemClick={p.onItemClick}
        onLockedItemClick={p.onLockedCommunityClick} onDeletePreset={p.onDeletePreset} onToggleShowcase={p.onToggleShowcase}
      />
    </>
  );
};
