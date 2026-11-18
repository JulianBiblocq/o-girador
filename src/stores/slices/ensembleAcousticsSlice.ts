/**
 * ensembleAcousticsSlice.ts — État & Persistance de l'Acoustique d'Ensemble (« Chœur de Peaux » & « Respiration de la Roda ») (< 80 lignes).
 * - Valeur par défaut `0.75` (`75 %`) avec fallback `?? 0.75` pour les projets/presets existants.
 * - Bascule instantanée `[ Avant / Après ]` (`isEnsembleAcousticsBypassed`) non persistée pour éviter tout oubli en bypass.
 */

import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';

export const DEFAULT_SKIN_CHORUS_AMOUNT = 0.75;
export const DEFAULT_RODA_BREATHING_AMOUNT = 0.75;
export const SKIN_CHORUS_STORAGE_KEY = 'ogirador_skin_chorus_amount_v1';
export const RODA_BREATHING_STORAGE_KEY = 'ogirador_roda_breathing_amount_v1';

export function sanitizeEnsembleAmount(val: unknown, fallback = DEFAULT_SKIN_CHORUS_AMOUNT): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(1, Math.round(val * 1000) / 1000));
}

function readStoredAmount(key: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw.trim() === '') return fallback;
    return sanitizeEnsembleAmount(Number(raw), fallback);
  } catch {
    return fallback;
  }
}

function writeStoredAmount(key: string, val: number): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, String(val));
  } catch { /* ignore */ }
}

export interface EnsembleAcousticsSlice {
  skinChorusAmount: number;
  rodaBreathingAmount: number;
  isEnsembleAcousticsBypassed: boolean;
  setSkinChorusAmount: (amount: number) => void;
  setRodaBreathingAmount: (amount: number) => void;
  setEnsembleAcousticsBypassed: (bypassed: boolean) => void;
  toggleEnsembleAcousticsBypassed: () => void;
}

export function getEffectiveSkinChorusAmount(
  state?: { skinChorusAmount?: number; isEnsembleAcousticsBypassed?: boolean } | null
): number {
  if (state?.isEnsembleAcousticsBypassed) return 0;
  return sanitizeEnsembleAmount(state?.skinChorusAmount, DEFAULT_SKIN_CHORUS_AMOUNT);
}

export function getEffectiveRodaBreathingAmount(
  state?: { rodaBreathingAmount?: number; isEnsembleAcousticsBypassed?: boolean } | null
): number {
  if (state?.isEnsembleAcousticsBypassed) return 0;
  return sanitizeEnsembleAmount(state?.rodaBreathingAmount, DEFAULT_RODA_BREATHING_AMOUNT);
}

export const createEnsembleAcousticsSlice: StateCreator<SequencerStore, [], [], EnsembleAcousticsSlice> = (set) => ({
  skinChorusAmount: readStoredAmount(SKIN_CHORUS_STORAGE_KEY, DEFAULT_SKIN_CHORUS_AMOUNT),
  rodaBreathingAmount: readStoredAmount(RODA_BREATHING_STORAGE_KEY, DEFAULT_RODA_BREATHING_AMOUNT),
  isEnsembleAcousticsBypassed: false,

  setSkinChorusAmount: (amount) => {
    const clean = sanitizeEnsembleAmount(amount, DEFAULT_SKIN_CHORUS_AMOUNT);
    writeStoredAmount(SKIN_CHORUS_STORAGE_KEY, clean);
    set({ skinChorusAmount: clean });
  },
  setRodaBreathingAmount: (amount) => {
    const clean = sanitizeEnsembleAmount(amount, DEFAULT_RODA_BREATHING_AMOUNT);
    writeStoredAmount(RODA_BREATHING_STORAGE_KEY, clean);
    set({ rodaBreathingAmount: clean });
  },
  setEnsembleAcousticsBypassed: (bypassed) => set({ isEnsembleAcousticsBypassed: Boolean(bypassed) }),
  toggleEnsembleAcousticsBypassed: () => set((s) => ({ isEnsembleAcousticsBypassed: !s.isEnsembleAcousticsBypassed })),
});
