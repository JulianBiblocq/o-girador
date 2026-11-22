import React, { useState, useEffect } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useCatalogPresetDeletion } from '../hooks/useCatalogPresetDeletion';
import { canMutatePreset, isMestreOrAdminProfile } from '../utils/presetPermissions';
import { resolveUserAccessPolicy } from '../utils/userAccessPolicy';
import { guardFeatureWithModal } from '../utils/cloudWriteGuard';
import { PresetAccordionCloudSections } from './preset-accordion/PresetAccordionCloudSections';
import { PresetAccordionLocalSection } from './preset-accordion/PresetAccordionLocalSection';
import { PresetAccordionDraftsSection } from './preset-accordion/PresetAccordionDraftsSection';
import { PresetAccordionSelectFallback } from './preset-accordion/PresetAccordionSelectFallback';
import { PresetAccordionHeader } from './preset-accordion/PresetAccordionHeader';
import { resolveCatalogThreeTiers } from './preset-accordion/presetAccordionTiers';
import { useShowcaseToggle } from './preset-accordion/useShowcaseToggle';
import { PresetAccordionSelectorProps } from './preset-accordion/presetAccordionTypes';

export type { PresetAccordionSelectorProps };

export const PresetAccordionSelector: React.FC<PresetAccordionSelectorProps> = ({
  lang, activePreset, currentSongTitle, publicCloudPresets = [], privateCloudPresets = [],
  localPresets = [], isCloudPresetsLoading = false, showGroupCatalogue = false, groupLabel,
  groupLogo, defaultPresetId = null, canSetDefaultPreset = false, onSetDefaultPreset,
  canEdit = false, canToggleDraftPreset, onToggleDraft, onToggleShowcase, onSelectPreset, className = '',
}) => {
  const audio = useAudio();
  const { userProfile, currentUser, isAdmin } = useAuth();
  const effectiveUid = userProfile?.uid || currentUser?.uid || null;
  const effectiveProfile = userProfile ? { ...userProfile, uid: effectiveUid || '' } : (effectiveUid ? { uid: effectiveUid } : null);
  const policy = resolveUserAccessPolicy(userProfile, { hasAuthUser: Boolean(effectiveUid), isAdminFlag: isAdmin });
  const { isSuperAdmin, handleToggleShowcase } = useShowcaseToggle(lang);

  const strictCanSetDefault = Boolean(canSetDefaultPreset && isMestreOrAdminProfile(effectiveProfile) && !policy.isTrialExpired);
  const canToggleDraftItem = (p: { id: string; ownerId?: string }) =>
    !policy.isTrialExpired && canMutatePreset(p, effectiveProfile) && (canToggleDraftPreset ? canToggleDraftPreset(p) : true);
  const { canDeletePreset, handleDeletePreset } = useCatalogPresetDeletion(lang, canEdit);

  const [isGroupOpen, setIsGroupOpen] = useState(showGroupCatalogue);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(!showGroupCatalogue);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isPersonalOpen, setIsPersonalOpen] = useState(false);

  useEffect(() => {
    setIsGroupOpen(showGroupCatalogue);
    setIsShowcaseOpen(!showGroupCatalogue);
  }, [showGroupCatalogue]);

  const handleItemClick = (val: string, cloudId?: string) => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (cloudId) url.searchParams.set('loadPreset', cloudId);
        else url.searchParams.delete('loadPreset');
        window.history.replaceState(null, '', url.toString());
      } catch (_) {}
    }
    onSelectPreset(val, cloudId);
  };

  const tiers = resolveCatalogThreeTiers({
    publicCloudPresets, privateCloudPresets, currentUserUid: effectiveUid,
    canViewDraft: (p) => canMutatePreset(p, effectiveProfile),
  });

  const groupTitle = lang === 'pt' ? `Catálogo ${groupLabel || 'do Grupo'}` : `Catalogue ${groupLabel || 'du Groupe'}`;
  const showcaseTitle = lang === 'pt' ? 'Vitrine de Descoberta' : 'Vitrine Découverte';
  const communityTitle = lang === 'pt' ? 'Catálogo Comunitário' : 'Catalogue Communautaire';
  const isItemActive = (val: string, name: string): boolean =>
    Boolean(activePreset === val || (currentSongTitle && currentSongTitle.trim().toLowerCase() === name.trim().toLowerCase()));

  return (
    <div data-tour-id="header-preset-selector" className={`flex flex-col gap-2 w-full ${className}`}>
      <PresetAccordionHeader lang={lang} currentSongTitle={currentSongTitle} />
      <div className="flex flex-col gap-1.5 w-full">
        <PresetAccordionCloudSections
          lang={lang} tiers={tiers} showGroupCatalogue={showGroupCatalogue}
          groupTitle={groupTitle} groupLogo={groupLogo} defaultPresetId={defaultPresetId}
          isCloudPresetsLoading={isCloudPresetsLoading}
          isGroupOpen={isGroupOpen} onToggleGroup={() => setIsGroupOpen((p) => !p)}
          isShowcaseOpen={isShowcaseOpen} onToggleShowcaseSection={() => setIsShowcaseOpen((p) => !p)}
          isCommunityOpen={isCommunityOpen} onToggleCommunity={() => setIsCommunityOpen((p) => !p)}
          isPersonalOpen={isPersonalOpen} onTogglePersonal={() => setIsPersonalOpen((p) => !p)}
          canAccessCommunityCatalog={policy.canAccessCommunityCatalog}
          maxPrivateCloudPresets={policy.maxPrivateCloudPresets}
          effectiveUid={effectiveUid} canEdit={canEdit} strictCanSetDefault={strictCanSetDefault}
          isSuperAdmin={isSuperAdmin} canToggleDraftItem={canToggleDraftItem} canDeletePreset={canDeletePreset}
          isItemActive={isItemActive} onItemClick={handleItemClick}
          onLockedCommunityClick={() => guardFeatureWithModal('community_catalog', userProfile, Boolean(effectiveUid))}
          onToggleDraft={onToggleDraft} onSetDefaultPreset={onSetDefaultPreset}
          onDeletePreset={handleDeletePreset} onToggleShowcase={onToggleShowcase || handleToggleShowcase}
        />
        <PresetAccordionLocalSection localPresets={localPresets} lang={lang} isItemActive={isItemActive} onItemClick={(name) => handleItemClick(name)} />
        <PresetAccordionDraftsSection lang={lang} onSelectDraft={(presetData, name) => { handleItemClick(`draft:${name}`); if (audio?.applyPreset) audio.applyPreset(presetData); }} />
      </div>

      <PresetAccordionSelectFallback
        activePreset={activePreset} currentSongTitle={currentSongTitle} lang={lang}
        showGroupCatalogue={showGroupCatalogue} groupTitle={groupTitle} showcaseTitle={showcaseTitle}
        communityTitle={communityTitle} canAccessCommunity={policy.canAccessCommunityCatalog}
        groupItems={tiers.groupItems} showcaseItems={tiers.showcaseItems} communityItems={tiers.communityItems}
        onSelect={handleItemClick}
      />
    </div>
  );
};
