/**
 * Fonctions de persistance locale pour les dispositions du bureau (< 45 lignes).
 */

import { DesktopWorkspaceLayout } from '../../types/desktopWorkspace.types';

const STORAGE_KEY = 'girador_desktop_workspace_layouts';

export function loadStoredLayouts(): DesktopWorkspaceLayout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanctuarisation mono-fenetre : forcer detached: false sur tous les panneaux memorises
    return parsed.map((layout: DesktopWorkspaceLayout) => ({
      ...layout,
      detachedPanels: {
        mixer: { ...layout.detachedPanels?.mixer, detached: false },
        roda: { ...layout.detachedPanels?.roda, detached: false },
        detailEditor: { ...layout.detachedPanels?.detailEditor, detached: false },
      }
    }));
  } catch (err) {
    console.warn('[useDesktopWorkspaceStore] Erreur lors de la lecture du localStorage:', err);
    return [];
  }
}

export function persistLayouts(layouts: DesktopWorkspaceLayout[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (err) {
    console.warn('[useDesktopWorkspaceStore] Erreur lors de l\'enregistrement dans le localStorage:', err);
  }
}
