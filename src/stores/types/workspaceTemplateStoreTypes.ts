
import { WorkspaceTemplate } from '../../types/workspaceTemplate.types';

export interface WorkspaceTemplateStoreState {
  templates: WorkspaceTemplate[];
  isLoadingCloud: boolean;
  isSyncing: boolean;

  setTemplates: (templates: WorkspaceTemplate[]) => void;
  addTemplate: (
    templateData: Omit<WorkspaceTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    userRole?: string
  ) => Promise<WorkspaceTemplate>;
  updateTemplateName: (id: string, newName: string) => Promise<void>;
  renameTemplate: (id: string, newName: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  syncCloudTemplates: (userUid: string | null, userRole?: string) => Promise<void>;
  syncWithCloud: (userUid: string | null, userRole?: string) => Promise<void>;
  mergeFromSnapshot: (cloudTemplates: WorkspaceTemplate[], userUid?: string) => Promise<void>;
}
