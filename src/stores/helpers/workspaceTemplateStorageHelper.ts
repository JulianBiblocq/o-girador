
import { WorkspaceTemplate } from '../../types/workspaceTemplate.types';

export const LOCAL_WORKSPACE_TEMPLATES_KEY = 'girador_workspace_templates';

export const loadInitialLocalTemplates = (): WorkspaceTemplate[] => {
  try {
    const raw = localStorage.getItem(LOCAL_WORKSPACE_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des gabarits locaux:', e);
  }
  return [];
};

export const saveTemplatesToStorage = (templates: WorkspaceTemplate[]) => {
  try {
    localStorage.setItem(LOCAL_WORKSPACE_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde des gabarits locaux:', e);
  }
};
