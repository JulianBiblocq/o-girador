/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { WorkspaceTemplate } from '../types/workspaceTemplate.types';
import { WorkspaceTemplateStoreState } from './types/workspaceTemplateStoreTypes';
import {
  loadInitialLocalTemplates,
  saveTemplatesToStorage,
} from './helpers/workspaceTemplateStorageHelper';

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

    const newTemplate: WorkspaceTemplate = {
      ...templateData,
      id: localId,
      createdAt: now,
      updatedAt: now
    };

    const currentList = get().templates;
    const updatedLocally = [newTemplate, ...currentList.filter((t) => t.id !== localId)];
    saveTemplatesToStorage(updatedLocally);
    set({ templates: updatedLocally });

    if (!isOfflineOrGuest) {
      try {
        const { saveWorkspaceTemplateToCloud } = await import('../cloudWorkspaceTemplates');
        const cloudId = await saveWorkspaceTemplateToCloud(newTemplate, userRole);

        const templateWithCloudId: WorkspaceTemplate = {
          ...newTemplate,
          id: cloudId
        };

        const finalizedList = get().templates.map((t) =>
          t.id === localId ? templateWithCloudId : t
        );
        saveTemplatesToStorage(finalizedList);
        set({ templates: finalizedList });

        return templateWithCloudId;
      } catch (err) {
        console.warn("Synchronisation Cloud du gabarit échouée (sauvegarde locale conservée):", err);
      }
    }

    return newTemplate;
  },

  updateTemplateName: async (id: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;

    const updated = get().templates.map((t) =>
      t.id === id ? { ...t, name: cleanName, updatedAt: Date.now() } : t
    );
    saveTemplatesToStorage(updated);
    set({ templates: updated });

    if (!id.startsWith('tpl_local_')) {
      try {
        const { updateWorkspaceTemplateNameInCloud } = await import('../cloudWorkspaceTemplates');
        await updateWorkspaceTemplateNameInCloud(id, cleanName);
      } catch (err) {
        console.warn("Échec mise à jour nom gabarit Cloud:", err);
      }
    }
  },

  deleteTemplate: async (id: string) => {
    const remaining = get().templates.filter((t) => t.id !== id);
    saveTemplatesToStorage(remaining);
    set({ templates: remaining });

    if (!id.startsWith('tpl_local_')) {
      try {
        const { deleteWorkspaceTemplateFromCloud } = await import('../cloudWorkspaceTemplates');
        await deleteWorkspaceTemplateFromCloud(id);
      } catch (err) {
        console.warn("Suppression Cloud du gabarit ignorée ou échouée:", err);
      }
    }
  },

  syncCloudTemplates: async (userUid) => {
    if (!userUid || userUid === 'local') return;

    set({ isLoadingCloud: true });
    try {
      const { fetchCloudWorkspaceTemplates } = await import('../cloudWorkspaceTemplates');
      const cloudTemplates = await fetchCloudWorkspaceTemplates(userUid);
      const currentTemplates = get().templates;

      const mergedMap = new Map<string, WorkspaceTemplate>();
      currentTemplates.forEach((t) => mergedMap.set(t.id, t));
      cloudTemplates.forEach((t) => mergedMap.set(t.id, t));

      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

      saveTemplatesToStorage(mergedList);
      set({
        templates: mergedList,
        isLoadingCloud: false
      });
    } catch (err) {
      console.warn("Erreur lors de la synchronisation des gabarits cloud:", err);
      set({ isLoadingCloud: false });
    }
  },

  renameTemplate: (id, newName) => get().updateTemplateName(id, newName),
  syncWithCloud: (userUid, userRole) => get().syncCloudTemplates(userUid, userRole)
}));
