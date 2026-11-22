export interface CatalogAccordionPresetItem {
  id: string;
  name: string;
  selectValue?: string;
  visibility?: string;
  isDraft?: boolean;
  isShowcase?: boolean;
  ownerId?: string;
  groupId?: string | null;
  audioUrl?: string | null;
  isEmbeddedFallback?: boolean;
}

export interface CatalogThreeTiersResult {
  groupItems: CatalogAccordionPresetItem[];
  showcaseItems: CatalogAccordionPresetItem[];
  communityItems: CatalogAccordionPresetItem[];
  personalDraftItems: CatalogAccordionPresetItem[];
  usedShowcaseFallback: boolean;
}

const EMBEDDED_SHOWCASE_FALLBACK: CatalogAccordionPresetItem[] = [
  { id: 'embedded:vou-vadiar', selectValue: 'Vou vadiar carnaval.json', name: 'Vou vadiar carnaval', isShowcase: true, isEmbeddedFallback: true },
  { id: 'embedded:baque-de-imale', selectValue: 'baque-de-imale', name: 'Baque de Imalê', isShowcase: true, isEmbeddedFallback: true },
  { id: 'embedded:convencao-2', selectValue: '_convencao_2.json', name: 'Convenção 2', isShowcase: true, isEmbeddedFallback: true },
];

export function resolveCatalogThreeTiers(params: {
  publicCloudPresets: CatalogAccordionPresetItem[];
  privateCloudPresets: CatalogAccordionPresetItem[];
  currentUserUid?: string | null;
  canViewDraft: (preset: CatalogAccordionPresetItem) => boolean;
}): CatalogThreeTiersResult {
  const { publicCloudPresets, privateCloudPresets, currentUserUid, canViewDraft } = params;

  const personalDraftItems = privateCloudPresets.filter(
    (p) =>
      Boolean(currentUserUid) &&
      p.ownerId === currentUserUid &&
      p.visibility === 'private' &&
      !p.groupId
  );
  const personalIds = new Set(personalDraftItems.map((p) => p.id));

  const groupItems = privateCloudPresets.filter(
    (p) => !personalIds.has(p.id) && (p.isDraft !== true || canViewDraft(p))
  );

  const nonDraftPublic = publicCloudPresets.filter((p) => p.isDraft !== true);
  const explicitShowcaseFromPublic = nonDraftPublic.filter((p) => p.isShowcase === true);
  const explicitShowcaseFromGroup = groupItems.filter((p) => p.isShowcase === true && p.isDraft !== true);

  const seenShowcaseIds = new Set<string>();
  const explicitShowcase: CatalogAccordionPresetItem[] = [];
  for (const item of [...explicitShowcaseFromPublic, ...explicitShowcaseFromGroup]) {
    if (!seenShowcaseIds.has(item.id)) {
      seenShowcaseIds.add(item.id);
      explicitShowcase.push(item);
    }
  }

  let showcaseItems: CatalogAccordionPresetItem[] = explicitShowcase;
  let usedShowcaseFallback = false;

  if (showcaseItems.length === 0) {
    usedShowcaseFallback = true;
    const adminGlobals = nonDraftPublic.filter((p) => p.visibility === 'admin_global');
    showcaseItems = adminGlobals.length > 0 ? adminGlobals : EMBEDDED_SHOWCASE_FALLBACK;
  }

  const showcaseIdSet = new Set(showcaseItems.map((p) => p.id));
  const communityItems = publicCloudPresets.filter(
    (p) => !showcaseIdSet.has(p.id) && (p.isDraft !== true || canViewDraft(p))
  );

  return {
    groupItems,
    showcaseItems,
    communityItems,
    personalDraftItems,
    usedShowcaseFallback,
  };
}
