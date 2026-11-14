import { create } from 'zustand';

export type OficinaSectionId =
  | 'lutherie'
  | 'groove'
  | 'kit'
  | 'prensa'
  | 'sinais'
  | 'gabarits'
  | 'audio'
  | 'midi'
  | 'desktopLayouts'
  | 'performance'
  | 'ajuda'
  | 'aovivo-lab';

export type OficinaGrooveTier = 'global' | 'track' | 'pattern';

export interface OficinaFocusTarget {
  trackId?: number | null;
  patternId?: number | string | null;
  grooveTier?: OficinaGrooveTier;
  instrumentId?: string | null;
}

export interface OficinaReturnEditorContext {
  trackId: number;
  trackLabel?: string;
  patternId?: number | string | null;
  patternLabel?: string;
  stepIdx?: number | null;
  isPreRoll?: boolean;
  subIndex?: 0 | 1 | null;
  activeTool?: string | null;
}

interface SettingsState {
  isSettingsOpen: boolean;
  activeSection: OficinaSectionId;
  oficinaFocus: OficinaFocusTarget | null;
  returnEditorContext: OficinaReturnEditorContext | null;
  strokeDefaults: Record<string, { volume?: number; decay?: number }>;
  enabledSignalIds: string[] | null;
  forcedStrokes: Record<string, boolean>;
  setIsSettingsOpen: (isSettingsOpen: boolean) => void;
  toggleSettings: () => void;
  setActiveSection: (section: OficinaSectionId) => void;
  setOficinaFocus: (focus: OficinaFocusTarget | null) => void;
  openOficinaSection: (
    section: OficinaSectionId,
    options?: { focus?: OficinaFocusTarget | null; returnContext?: OficinaReturnEditorContext | null }
  ) => void;
  clearReturnEditorContext: () => void;
  setStrokeDefault: (key: string, values: { volume?: number; decay?: number }) => void;
  toggleSignalEnabled: (id: string, allIds?: string[]) => void;
  setSignalsBatch: (ids: string[], enabled: boolean, allIds: string[]) => void;
  setStrokeForcedState: (key: string, enabled: boolean) => void;
}

export const useSequencerSettingsStore = create<SettingsState>((set) => ({
  isSettingsOpen: false,
  activeSection: 'lutherie',
  oficinaFocus: null,
  returnEditorContext: null,
  strokeDefaults: {},
  enabledSignalIds: null,
  forcedStrokes: {},
  setIsSettingsOpen: (isSettingsOpen) =>
    set((state) => ({
      isSettingsOpen,
      returnEditorContext: isSettingsOpen ? state.returnEditorContext : null,
      oficinaFocus: isSettingsOpen ? state.oficinaFocus : null,
    })),
  toggleSettings: () =>
    set((state) => {
      const next = !state.isSettingsOpen;
      return {
        isSettingsOpen: next,
        returnEditorContext: next ? state.returnEditorContext : null,
        oficinaFocus: next ? state.oficinaFocus : null,
      };
    }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setOficinaFocus: (oficinaFocus) => set({ oficinaFocus }),
  openOficinaSection: (section, options) =>
    set({
      isSettingsOpen: true,
      activeSection: section,
      oficinaFocus: options?.focus ?? null,
      returnEditorContext: options?.returnContext !== undefined ? options.returnContext : null,
    }),
  clearReturnEditorContext: () => set({ returnEditorContext: null }),
  setStrokeDefault: (key, values) =>
    set((state) => ({
      strokeDefaults: {
        ...state.strokeDefaults,
        [key]: { ...(state.strokeDefaults[key] || {}), ...values },
      },
    })),
  toggleSignalEnabled: (id, allIds) =>
    set((state) => {
      const current = state.enabledSignalIds !== null ? state.enabledSignalIds : (allIds || []);
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { enabledSignalIds: next };
    }),
  setSignalsBatch: (ids, enabled, allIds) =>
    set((state) => {
      const current = state.enabledSignalIds !== null ? state.enabledSignalIds : allIds;
      const next = enabled
        ? Array.from(new Set([...current, ...ids]))
        : current.filter((id) => !ids.includes(id));
      return { enabledSignalIds: next };
    }),
  setStrokeForcedState: (key, enabled) =>
    set((state) => ({
      forcedStrokes: { ...state.forcedStrokes, [key]: enabled },
    })),
}));
