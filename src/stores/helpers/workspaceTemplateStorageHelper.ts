import { WorkspaceTemplate } from '../../types/workspaceTemplate.types';
import { DEFAULT_BATUQUE_TEMPLATES_SEED } from './defaultBatuqueTemplatesSeed';

export const LOCAL_WORKSPACE_TEMPLATES_KEY = 'girador_workspace_templates';
export const TEMPLATES_SEEDED_KEY = 'girador_templates_seeded_v2';

const LEGACY_SEED_IDS = new Set([
  'tpl_local_1792961919500_eqeto7k',
  'tpl_local_1792763243361_wdzerfb',
]);

export const loadInitialLocalTemplates = (): WorkspaceTemplate[] => {
  let existingList: WorkspaceTemplate[] = [];

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_WORKSPACE_TEMPLATES_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existingList = parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des gabarits locaux:', e);
  }

  const isSeededV2 = typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem(TEMPLATES_SEEDED_KEY)) : false;
  if (!isSeededV2) {
    existingList = existingList.filter((t) => !LEGACY_SEED_IDS.has(t.id));
  }

  let hasSeedChanges = !isSeededV2;
  const seedIds = new Set(DEFAULT_BATUQUE_TEMPLATES_SEED.map((s) => s.id));
  const customOnly = existingList.filter((t) => !seedIds.has(t.id));
  if (customOnly.length + DEFAULT_BATUQUE_TEMPLATES_SEED.length !== existingList.length) {
    hasSeedChanges = true;
  }

  const mergedList = [...DEFAULT_BATUQUE_TEMPLATES_SEED, ...customOnly];

  if (hasSeedChanges && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_SEEDED_KEY, 'true');
      localStorage.setItem(LOCAL_WORKSPACE_TEMPLATES_KEY, JSON.stringify(mergedList));
    } catch (e) {
      console.warn('Erreur lors de l’injection initiale des gabarits:', e);
    }
  }

  return mergedList;
};

export const saveTemplatesToStorage = (templates: WorkspaceTemplate[]) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_WORKSPACE_TEMPLATES_KEY, JSON.stringify(templates));
    }
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des gabarits locaux:', e);
  }
};
