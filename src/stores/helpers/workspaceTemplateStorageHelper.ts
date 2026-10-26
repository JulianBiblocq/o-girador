/**
 * Gestionnaire du localStorage pour les gabarits de batuque (< 50 lignes).
 */
import { WorkspaceTemplate } from '../../types/workspaceTemplate.types';
import { DEFAULT_BATUQUE_TEMPLATES_SEED } from './defaultBatuqueTemplatesSeed';

export const LOCAL_WORKSPACE_TEMPLATES_KEY = 'girador_workspace_templates';
export const TEMPLATES_SEEDED_KEY = 'girador_templates_seeded_v1';

export const loadInitialLocalTemplates = (): WorkspaceTemplate[] => {
  let existingList: WorkspaceTemplate[] = [];

  try {
    const raw = localStorage.getItem(LOCAL_WORKSPACE_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existingList = parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des gabarits locaux:', e);
  }

  // Injection initiale unique de secours (Règle 3)
  const isAlreadySeeded = Boolean(localStorage.getItem(TEMPLATES_SEEDED_KEY));
  if (!isAlreadySeeded) {
    try {
      localStorage.setItem(TEMPLATES_SEEDED_KEY, 'true');
      const missingSeeds = DEFAULT_BATUQUE_TEMPLATES_SEED.filter(
        (seed) => !existingList.some((t) => t.id === seed.id || t.name === seed.name)
      );
      if (missingSeeds.length > 0) {
        existingList = [...existingList, ...missingSeeds];
        localStorage.setItem(LOCAL_WORKSPACE_TEMPLATES_KEY, JSON.stringify(existingList));
      }
    } catch (e) {
      console.warn('Erreur lors de l’injection initiale des gabarits:', e);
    }
  }

  return existingList;
};

export const saveTemplatesToStorage = (templates: WorkspaceTemplate[]) => {
  try {
    localStorage.setItem(LOCAL_WORKSPACE_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des gabarits locaux:', e);
  }
};
