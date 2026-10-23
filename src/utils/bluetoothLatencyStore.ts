/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Store persistant pour les profils et la latence visuelle Bluetooth (< 120 lignes).
 */
import { create } from 'zustand';

export interface BluetoothDeviceProfile {
  id: string;
  name: string;
  type: 'speaker' | 'bt_speaker' | 'bt_headphones' | 'custom';
  offsetMs: number;
}

const STORAGE_KEY = 'ogirador_bt_profiles_v1';

export const DEFAULT_PROFILES: BluetoothDeviceProfile[] = [
  { id: 'speaker', name: 'Haut-parleur / Filaire', type: 'speaker', offsetMs: 0 },
  { id: 'bt_speaker', name: 'Enceinte sans fil', type: 'bt_speaker', offsetMs: 240 },
  { id: 'bt_headphones', name: 'Casque sans fil', type: 'bt_headphones', offsetMs: 180 },
];

let cachedOffsetSec = 0;
export function getBluetoothVisualOffsetSec(): number {
  return cachedOffsetSec;
}

interface StoredData {
  hasCompletedOnboarding: boolean;
  activeProfileId: string;
  bluetoothVisualOffsetMs: number;
  profiles: BluetoothDeviceProfile[];
}

function loadInitialState(): StoredData {
  if (typeof window === 'undefined') {
    return { hasCompletedOnboarding: false, activeProfileId: 'speaker', bluetoothVisualOffsetMs: 0, profiles: DEFAULT_PROFILES };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const offsetMs = typeof parsed.bluetoothVisualOffsetMs === 'number' ? parsed.bluetoothVisualOffsetMs : 0;
      cachedOffsetSec = offsetMs / 1000;
      return {
        hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
        activeProfileId: parsed.activeProfileId || 'speaker',
        bluetoothVisualOffsetMs: offsetMs,
        profiles: Array.isArray(parsed.profiles) && parsed.profiles.length > 0 ? parsed.profiles : DEFAULT_PROFILES,
      };
    }
  } catch (_) {}
  return { hasCompletedOnboarding: false, activeProfileId: 'speaker', bluetoothVisualOffsetMs: 0, profiles: DEFAULT_PROFILES };
}

const initialData = loadInitialState();

interface BluetoothLatencyStoreState extends StoredData {
  isModalOpen: boolean;
  activeModalTab: 'onboarding' | 'selector' | 'ping' | 'visual';
  openModal: (tab?: 'onboarding' | 'selector' | 'ping' | 'visual') => void;
  closeModal: () => void;
  setActiveProfile: (id: string) => void;
  setBluetoothVisualOffsetMs: (ms: number) => void;
  addProfile: (profile: Omit<BluetoothDeviceProfile, 'id'>) => string;
  updateProfile: (id: string, updates: Partial<BluetoothDeviceProfile>) => void;
  deleteProfile: (id: string) => void;
  setHasCompletedOnboarding: (val: boolean) => void;
}

export const useBluetoothLatencyStore = create<BluetoothLatencyStoreState>((set, get) => {
  const persist = (next: Partial<StoredData>) => {
    try {
      const s = { ...get(), ...next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        activeProfileId: s.activeProfileId,
        bluetoothVisualOffsetMs: s.bluetoothVisualOffsetMs,
        profiles: s.profiles,
      }));
    } catch (_) {}
  };

  return {
    ...initialData,
    isModalOpen: false,
    activeModalTab: 'onboarding',
    openModal: (tab = 'selector') => set({ isModalOpen: true, activeModalTab: tab }),
    closeModal: () => set({ isModalOpen: false }),
    setActiveProfile: (id) => {
      const prof = get().profiles.find((p) => p.id === id);
      const offsetMs = prof ? prof.offsetMs : 0;
      cachedOffsetSec = offsetMs / 1000;
      set({ activeProfileId: id, bluetoothVisualOffsetMs: offsetMs });
      persist({ activeProfileId: id, bluetoothVisualOffsetMs: offsetMs });
    },
    setBluetoothVisualOffsetMs: (ms) => {
      const clamped = Math.max(0, Math.min(600, Math.round(ms)));
      cachedOffsetSec = clamped / 1000;
      const updated = get().profiles.map((p) => (p.id === get().activeProfileId ? { ...p, offsetMs: clamped } : p));
      set({ bluetoothVisualOffsetMs: clamped, profiles: updated });
      persist({ bluetoothVisualOffsetMs: clamped, profiles: updated });
    },
    addProfile: (profile) => {
      const id = 'bt_' + Date.now().toString(36);
      const newProf: BluetoothDeviceProfile = { ...profile, id };
      const profiles = [...get().profiles, newProf];
      cachedOffsetSec = newProf.offsetMs / 1000;
      set({ profiles, activeProfileId: id, bluetoothVisualOffsetMs: newProf.offsetMs });
      persist({ profiles, activeProfileId: id, bluetoothVisualOffsetMs: newProf.offsetMs });
      return id;
    },
    updateProfile: (id, updates) => {
      const profiles = get().profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const activeProf = profiles.find((p) => p.id === get().activeProfileId);
      const offsetMs = activeProf ? activeProf.offsetMs : get().bluetoothVisualOffsetMs;
      cachedOffsetSec = offsetMs / 1000;
      set({ profiles, bluetoothVisualOffsetMs: offsetMs });
      persist({ profiles, bluetoothVisualOffsetMs: offsetMs });
    },
    deleteProfile: (id) => {
      if (['speaker', 'bt_speaker', 'bt_headphones'].includes(id)) return;
      const profiles = get().profiles.filter((p) => p.id !== id);
      const activeProfileId = get().activeProfileId === id ? 'speaker' : get().activeProfileId;
      const activeProf = profiles.find((p) => p.id === activeProfileId);
      const offsetMs = activeProf ? activeProf.offsetMs : 0;
      cachedOffsetSec = offsetMs / 1000;
      set({ profiles, activeProfileId, bluetoothVisualOffsetMs: offsetMs });
      persist({ profiles, activeProfileId, bluetoothVisualOffsetMs: offsetMs });
    },
    setHasCompletedOnboarding: (val) => {
      set({ hasCompletedOnboarding: val });
      persist({ hasCompletedOnboarding: val });
    },
  };
});

