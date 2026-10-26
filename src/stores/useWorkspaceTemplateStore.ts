/**
 * Store Zustand pour les gabarits de batuque avec fusion résiliente (< 135 lignes).
 */
import { create } from 'zustand';
import { WorkspaceTemplate } from '../types/workspaceTemplate.types';
import { WorkspaceTemplateStoreState } from './types/workspaceTemplateStoreTypes';
import { loadInitialLocalTemplates, saveTemplatesToStorage } from './helpers/workspaceTemplateStorageHelper';
import { mergeTemplatesLists } from './helpers/workspaceTemplateMergeHelper';

export type { WorkspaceTemplateStoreState };

const initialLocalTemplates = loadInitialLocalTemplates();

export const useWorkspaceTemplateStore = create<WorkspaceTemplateStoreState>((set, get) => ({
  templates: initialLocalTemplates,
  isLoadingCloud: false,
  get isSyncing() {
    return get().isLoadingCloud;
  },

  setTemplates: (templates) => {
    saveTemplatesToStorage(templates);
    set({ templates });
  },

  addTemplate: async (templateData, userRole) => {
    const now = Date.now();
    const isOfflineOrGuest = !templateData.ownerId || templateData.ownerId === 'local';
    const localId = `tpl_local_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const newTemplate: WorkspaceTemplate = { ...templateData, id: localId, createdAt: now, updatedAt: now };
    const currentList = get().templates;
    const updatedLocally = [newTemplate, ...currentList.filter((t) => t.id !== localId)];
    saveTemplatesToStorage(updatedLocally);
    set({ templates: updatedLocally });

    if (!isOfflineOrGuest) {
      try {
        const { saveWorkspaceTemplateToCloud } = await import('../cloudWorkspaceTemplates');
        const cloudId = await saveWorkspaceTemplateToCloud(newTemplate, userRole);
        const templateWithCloudId: WorkspaceTemplate = { ...newTemplate, id: cloudId };
        const finalizedList = get().templates.map((t) => (t.id === localId ? templateWithCloudId : t));
        saveTemplatesToStorage(finalizedList);
        set({ templates: finalizedList });
        return templateWithCloudId;
      } catch (err) {
        console.warn('Synchronisation Cloud du gabarit échouée (sauvegarde locale conservée):', err);
      }
    }
    return newTemplate;
  },

  updateTemplateName: async (id: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;

    const updated = get().templates.map((t) => (t.id === id ? { ...t, name: cleanName, updatedAt: Date.now() } : t));
    saveTemplatesToStorage(updated);
    set({ templates: updated });

    try {
      const { updateWorkspaceTemplateNameInCloud } = await import('../cloudWorkspaceTemplates');
      await updateWorkspaceTemplateNameInCloud(id, cleanName);
    } catch (err) {
      console.warn('Échec mise à jour nom gabarit Cloud:', err);
    }
  },

  deleteTemplate: async (id: string) => {
    const remaining = get().templates.filter((t) => t.id !== id);
    saveTemplatesToStorage(remaining);
    set({ templates: remaining });

    try {
      const { deleteWorkspaceTemplateFromCloud } = await import('../cloudWorkspaceTemplates');
      await deleteWorkspaceTemplateFromCloud(id);
    } catch (err) {
      console.warn('Suppression Cloud du gabarit échouée:', err);
    }
  },

  syncCloudTemplates: async (userUid, userRole) => {
    if (!userUid || userUid === 'local') return;

    set({ isLoadingCloud: true });
    try {
      const { fetchCloudWorkspaceTemplates, saveWorkspaceTemplateToCloud } = await import('../cloudWorkspaceTemplates');
      const cloudTemplates = await fetchCloudWorkspaceTemplates(userUid);
      const currentTemplates = get().templates;

      const { merged, templatesToUpload, hasChanges } = mergeTemplatesLists(currentTemplates, cloudTemplates, userUid);

      if (hasChanges) {
        saveTemplatesToStorage(merged);
        set({ templates: merged, isLoadingCloud: false });
      } else {
        set({ isLoadingCloud: false });
      }

      // Auto-migration en arrière-plan des gabarits locaux vers le profil Cloud
      if (templatesToUpload.length > 0) {
        for (const tpl of templatesToUpload) {
          saveWorkspaceTemplateToCloud(tpl, userRole).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Erreur lors de la synchronisation des gabarits cloud:', err);
      set({ isLoadingCloud: false });
    }
  },

  mergeFromSnapshot: async (cloudTemplates, userUid) => {
    if (!Array.isArray(cloudTemplates)) return;
    const currentTemplates = get().templates;
    const { merged, templatesToUpload, hasChanges } = mergeTemplatesLists(currentTemplates, cloudTemplates, userUid);

    // Garde anti-boucle infinie (Règle 1) : arrêt immédiat si aucun changement
    if (!hasChanges) return;

    saveTemplatesToStorage(merged);
    set({ templates: merged });

    if (templatesToUpload.length > 0 && userUid && userUid !== 'local') {
      const { saveWorkspaceTemplateToCloud } = await import('../cloudWorkspaceTemplates');
      for (const tpl of templatesToUpload) {
        saveWorkspaceTemplateToCloud(tpl).catch(() => {});
      }
    }
  },

  renameTemplate: (id, newName) => get().updateTemplateName(id, newName),
  syncWithCloud: (userUid, userRole) => get().syncCloudTemplates(userUid, userRole),
}));
