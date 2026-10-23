/**
 * Store persistant pour le brouillon et derniers réglages du Labo Photo (< 115 lignes).
 */

import { create } from 'zustand';
import { CordelOptions, defaultCordelOptions } from '../utils/cordelEffect';

export const STORAGE_KEY_LAST_OPTIONS = 'girador_photolab_last_options';
export const STORAGE_KEY_DRAFT = 'girador_photolab_draft';
export const STORAGE_KEY_PRESETS = 'girador_photolab_saved_presets';

export interface SavedPhotoLabPreset {
  id: string;
  name: string;
  options: CordelOptions;
}

export interface PhotoLabDraftState {
  signalName: string;
  beatsCount: 1 | 4 | 5;
  rawFrames: string[];
  frames: string[];
  cordelOptions: CordelOptions;
  frameOverrides: Record<number, Partial<CordelOptions>>;
  selectedFrameIndex: number;
  editingSignalId: string | null;

  setSignalName: (signalName: string) => void;
  setBeatsCount: (beatsCount: 1 | 4 | 5) => void;
  setRawFrames: (rawFrames: string[]) => void;
  setFrames: (frames: string[]) => void;
  setCordelOptions: (options: CordelOptions) => void;
  updateCordelOptions: (patch: Partial<CordelOptions>) => void;
  setFrameOverrides: (overrides: Record<number, Partial<CordelOptions>>) => void;
  setSelectedFrameIndex: (selectedFrameIndex: number) => void;
  setEditingSignalId: (editingSignalId: string | null) => void;
  setFullDraft: (data: Partial<PhotoLabDraftState>) => void;
  resetDraftAfterSave: () => void;
  resetDraftCompletely: () => void;
}

function safeSaveDraft(d: any) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(d)); }
  catch { try { sessionStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({ ...d, rawFrames: [] })); } catch (_) {} }
}

function safeSaveLastOptions(opts: CordelOptions) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY_LAST_OPTIONS, JSON.stringify(opts)); } catch (_) {}
}

function loadInitialState() {
  let cordelOptions = { ...defaultCordelOptions };
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_OPTIONS);
      if (saved) cordelOptions = { ...defaultCordelOptions, ...JSON.parse(saved) };
    } catch (_) {}
  }
  let d: any = {};
  if (typeof window !== 'undefined') {
    try { const saved = sessionStorage.getItem(STORAGE_KEY_DRAFT); if (saved) d = JSON.parse(saved); } catch (_) {}
  }
  return {
    signalName: typeof d.signalName === 'string' ? d.signalName : '',
    beatsCount: (d.beatsCount === 4 || d.beatsCount === 5 ? d.beatsCount : 1) as 1 | 4 | 5,
    rawFrames: Array.isArray(d.rawFrames) ? d.rawFrames : [],
    frames: Array.isArray(d.frames) ? d.frames : [],
    cordelOptions,
    frameOverrides: d.frameOverrides && typeof d.frameOverrides === 'object' ? d.frameOverrides : {},
    selectedFrameIndex: typeof d.selectedFrameIndex === 'number' ? d.selectedFrameIndex : 0,
    editingSignalId: typeof d.editingSignalId === 'string' ? d.editingSignalId : null,
  };
}

const initial = loadInitialState();

export const usePhotoLabDraftStore = create<PhotoLabDraftState>((set, get) => ({
  ...initial,

  setSignalName: (signalName) => { set({ signalName }); safeSaveDraft({ ...get(), signalName }); },
  setBeatsCount: (beatsCount) => { set({ beatsCount }); safeSaveDraft({ ...get(), beatsCount }); },
  setRawFrames: (rawFrames) => { set({ rawFrames }); safeSaveDraft({ ...get(), rawFrames }); },
  setFrames: (frames) => { set({ frames }); safeSaveDraft({ ...get(), frames }); },
  setCordelOptions: (cordelOptions) => {
    set({ cordelOptions }); safeSaveLastOptions(cordelOptions);
  },
  updateCordelOptions: (patch) => {
    const cordelOptions = { ...get().cordelOptions, ...patch };
    set({ cordelOptions }); safeSaveLastOptions(cordelOptions);
  },
  setFrameOverrides: (frameOverrides) => { set({ frameOverrides }); safeSaveDraft({ ...get(), frameOverrides }); },
  setSelectedFrameIndex: (selectedFrameIndex) => { set({ selectedFrameIndex }); safeSaveDraft({ ...get(), selectedFrameIndex }); },
  setEditingSignalId: (editingSignalId) => { set({ editingSignalId }); safeSaveDraft({ ...get(), editingSignalId }); },
  setFullDraft: (data) => {
    set(data);
    const curr = get();
    safeSaveDraft(curr);
    if (data.cordelOptions) safeSaveLastOptions(curr.cordelOptions);
  },
  resetDraftAfterSave: () => {
    const cleared = { signalName: '', rawFrames: [], frames: [], frameOverrides: {}, selectedFrameIndex: 0, editingSignalId: null };
    set(cleared);
    safeSaveDraft({ ...get(), ...cleared });
  },
  resetDraftCompletely: () => {
    const cleared = { signalName: '', rawFrames: [], frames: [], frameOverrides: {}, selectedFrameIndex: 0, editingSignalId: null, cordelOptions: { ...defaultCordelOptions } };
    set(cleared);
    safeSaveDraft(cleared);
    safeSaveLastOptions(defaultCordelOptions);
  },
}));
