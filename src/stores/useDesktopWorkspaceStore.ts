/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { DesktopWorkspaceLayout, DetachedPanelKey } from '../types/desktopWorkspace.types';
import { detachedWindowManager } from '../utils/detachedWindowManager';
import { useSequencerStore } from './useSequencerStore';

const STORAGE_KEY = 'girador_desktop_workspace_layouts';

function loadStoredLayouts(): DesktopWorkspaceLayout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 🛡️ Sanctuarisation mono-fenêtre : forcer detached: false sur tous les panneaux mémorisés
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

function persistLayouts(layouts: DesktopWorkspaceLayout[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (err) {
    console.warn('[useDesktopWorkspaceStore] Erreur lors de l\'enregistrement dans le localStorage:', err);
  }
}

export interface DesktopWorkspaceStore {
  layouts: DesktopWorkspaceLayout[];
  activeLayoutId: string | null;
  saveCurrentLayout: (name: string) => DesktopWorkspaceLayout;
  applyLayout: (layoutId: string) => boolean;
  deleteLayout: (layoutId: string) => void;
  renameLayout: (layoutId: string, newName: string) => void;
  getActiveLayout: () => DesktopWorkspaceLayout | undefined;
}

export const useDesktopWorkspaceStore = create<DesktopWorkspaceStore>((set, get) => ({
  layouts: loadStoredLayouts(),
  activeLayoutId: null,

  getActiveLayout: () => {
    const { layouts, activeLayoutId } = get();
    return layouts.find(l => l.id === activeLayoutId);
  },

  saveCurrentLayout: (name: string) => {
    const seq = useSequencerStore.getState();
    const isConsoleDetached = Boolean(seq.isConsoleDetached) && detachedWindowManager.isPanelOpen('mixer');
    const isCircleSequencerDetached = Boolean(seq.isCircleSequencerDetached) && detachedWindowManager.isPanelOpen('roda');
    const isInstrumentEditorDetached = Boolean(seq.isInstrumentEditorDetached) && detachedWindowManager.isPanelOpen('detailEditor');

    const mixerBounds = isConsoleDetached ? detachedWindowManager.getBounds('mixer') : undefined;
    const rodaBounds = isCircleSequencerDetached ? detachedWindowManager.getBounds('roda') : undefined;
    const detailBounds = isInstrumentEditorDetached ? detachedWindowManager.getBounds('detailEditor') : undefined;

    const newLayout: DesktopWorkspaceLayout = {
      id: 'layout_' + Date.now(),
      name: name.trim() || `Espace ${get().layouts.length + 1}`,
      createdAt: Date.now(),
      detachedPanels: {
        mixer: {
          detached: false,
          bounds: mixerBounds,
        },
        roda: {
          detached: false,
          bounds: rodaBounds,
        },
        detailEditor: {
          detached: false,
          bounds: detailBounds,
        },
      },
      uiState: {
        isTracksCollapsed: seq.isTracksCollapsed,
      },
    };

    const nextLayouts = [newLayout, ...get().layouts];
    persistLayouts(nextLayouts);

    set({
      layouts: nextLayouts,
      activeLayoutId: newLayout.id,
    });

    return newLayout;
  },

  applyLayout: (layoutId: string) => {
    const layout = get().layouts.find(l => l.id === layoutId);
    if (!layout) return false;

    const { uiState } = layout;

    // 🛡️ Mode multi-fenêtres neutralisé : tous les panneaux restent ancrés dans la fenêtre principale
    useSequencerStore.getState().setDetachedPanelsState({
      mixer: false,
      roda: false,
      detailEditor: false,
      linearDaw: false,
      timeline: false,
    });

    // 4. État UI
    if (uiState?.isTracksCollapsed !== undefined) {
      useSequencerStore.setState({ isTracksCollapsed: uiState.isTracksCollapsed });
    }

    set({ activeLayoutId: layoutId });
    return true;
  },

  deleteLayout: (layoutId: string) => {
    const nextLayouts = get().layouts.filter(l => l.id !== layoutId);
    persistLayouts(nextLayouts);
    set(state => ({
      layouts: nextLayouts,
      activeLayoutId: state.activeLayoutId === layoutId ? null : state.activeLayoutId,
    }));
  },

  renameLayout: (layoutId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const nextLayouts = get().layouts.map(l => (l.id === layoutId ? { ...l, name: trimmed } : l));
    persistLayouts(nextLayouts);
    set({ layouts: nextLayouts });
  },
}));
