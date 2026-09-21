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
    return Array.isArray(parsed) ? parsed : [];
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
          detached: isConsoleDetached,
          bounds: mixerBounds,
        },
        roda: {
          detached: isCircleSequencerDetached,
          bounds: rodaBounds,
        },
        detailEditor: {
          detached: isInstrumentEditorDetached,
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

    const { detachedPanels, uiState } = layout;

    // 1. Panneau Mixeur / Console
    if (detachedPanels.mixer) {
      if (detachedPanels.mixer.detached) {
        if (detachedPanels.mixer.bounds) {
          detachedWindowManager.setPendingBounds('mixer', detachedPanels.mixer.bounds);
          if (detachedWindowManager.isPanelOpen('mixer')) {
            detachedWindowManager.applyBoundsToOpenWindow('mixer', detachedPanels.mixer.bounds);
          }
        }
        useSequencerStore.getState().setDetachedPanelsState({ mixer: true });
      } else {
        useSequencerStore.getState().setDetachedPanelsState({ mixer: false });
      }
    }

    // 2. Panneau Roda (CircleSequencer)
    if (detachedPanels.roda) {
      if (detachedPanels.roda.detached) {
        if (detachedPanels.roda.bounds) {
          detachedWindowManager.setPendingBounds('roda', detachedPanels.roda.bounds);
          if (detachedWindowManager.isPanelOpen('roda')) {
            detachedWindowManager.applyBoundsToOpenWindow('roda', detachedPanels.roda.bounds);
          }
        }
        useSequencerStore.getState().setDetachedPanelsState({ roda: true });
      } else {
        useSequencerStore.getState().setDetachedPanelsState({ roda: false });
      }
    }

    // 3. Panneau Éditeur d'Instrument
    if (detachedPanels.detailEditor) {
      if (detachedPanels.detailEditor.detached) {
        if (detachedPanels.detailEditor.bounds) {
          detachedWindowManager.setPendingBounds('detailEditor', detachedPanels.detailEditor.bounds);
          if (detachedWindowManager.isPanelOpen('detailEditor')) {
            detachedWindowManager.applyBoundsToOpenWindow('detailEditor', detachedPanels.detailEditor.bounds);
          }
        }
        useSequencerStore.getState().setDetachedPanelsState({ detailEditor: true });
      } else {
        useSequencerStore.getState().setDetachedPanelsState({ detailEditor: false });
      }
    }

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
