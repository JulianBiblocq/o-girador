/**
 * Garde d'éligibilité clavier & throttle anti-mitraillette (~95 ms) pour l'exploration pas-à-pas Roda (< 95 lignes).
 * - Zéro conflit avec la saisie texte, l'Éditeur d'Instrument, la Timeline, les modales et la lecture en cours.
 */

import { audioEngine } from '../useAudioSync';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { useGuideStore } from '../../stores/useGuideStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTourStore } from '../../stores/useTourStore';
import { useWizardStore } from '../../stores/useWizardStore';
import { getUpperTagName, isEditableTarget } from '../../utils/crossRealmDom';

export const STEP_EXPLORE_REPEAT_THROTTLE_MS = 95;

let lastStepExploreAtMs = -Infinity;

export function resetStepExploreThrottle(): void {
  lastStepExploreAtMs = -Infinity;
}

export function hasOpenBlockingModalOrEditor(hostDoc?: Document | null): boolean {
  const seq = useSequencerStore.getState();
  if (seq.editingTrackId !== null) return true;
  const g: any = typeof window !== 'undefined' ? window : globalThis;
  if (Boolean(g?.oGiradorDetailEditorOpen)) return true;

  const settings = useSequencerSettingsStore.getState();
  if (settings.isSettingsOpen || settings.isProfileModalOpen) return true;
  if (useGuideStore.getState().isOpen || useTourStore.getState().isOpen) return true;

  const wiz = useWizardStore.getState();
  if (wiz.isWizardOpen || wiz.isIntroModalOpen) return true;
  if (seq.isVisitorAuthModalOpen || seq.isSubscriptionModalOpen) return true;

  const docs = [hostDoc, typeof document !== 'undefined' ? document : null].filter(Boolean) as Document[];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (
      d.querySelector?.(
        '[role="dialog"][aria-modal="true"], [data-testid="instrument-detail-editor-modal"], [data-testid="custom-dialog-backdrop"], #touch-stroke-selector-bubble, #modal-root > .fixed.inset-0, [data-photobooth-capture="true"]'
      )
    ) {
      return true;
    }
  }
  return false;
}

export function isRodaViewCurrentlyActive(isSatelliteWindow = false): boolean {
  const g: any = typeof window !== 'undefined' ? window : globalThis;
  const rawMode = g?.__OGIRADOR_VIEW_MODE__ ?? 'roda';
  const viewMode = rawMode || 'roda';
  if (viewMode !== 'roda') return false;
  if (isSatelliteWindow) {
    const satMode = useDesktopWorkspaceStore.getState().satelliteMode;
    if (satMode === 'editor' || satMode === 'oficina') return false;
  }
  return true;
}

export function tryHandleRodaStepExploreKeyDown(
  e: KeyboardEvent,
  onStepExplore: ((direction: 'next' | 'prev') => void) | undefined,
  opts?: { hostDoc?: Document | null; isSatelliteWindow?: boolean; isPlayingOverride?: boolean; nowMs?: number }
): boolean {
  if (!onStepExplore) return false;
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;

  const hostDoc = opts?.hostDoc ?? (typeof document !== 'undefined' ? document : null);
  const target = e.target as HTMLElement | null;
  const activeEl = (hostDoc?.activeElement as HTMLElement | null) ?? null;

  if (isEditableTarget(target) || isEditableTarget(activeEl) || activeEl?.id === 'letras-textarea') {
    return false;
  }
  if (opts?.isSatelliteWindow) {
    const activeTag = getUpperTagName(activeEl);
    if (activeTag === 'INPUT' && ((activeEl as HTMLInputElement)?.type || '').toLowerCase() === 'range') {
      return false;
    }
  }
  if (hasOpenBlockingModalOrEditor(hostDoc)) return false;
  if (!isRodaViewCurrentlyActive(Boolean(opts?.isSatelliteWindow))) return false;

  const isPlaying = opts?.isPlayingOverride ?? (
    useSequencerStore.getState().isPlaying || Boolean(audioEngine && audioEngine.getIsPlaying())
  );
  if (isPlaying) return false;

  e.preventDefault();
  e.stopPropagation();
  if (activeEl && typeof activeEl.blur === 'function') activeEl.blur();
  if (target && typeof target.blur === 'function') target.blur();

  const nowMs = opts?.nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (e.repeat && nowMs - lastStepExploreAtMs < STEP_EXPLORE_REPEAT_THROTTLE_MS) {
    return true;
  }
  lastStepExploreAtMs = nowMs;
  onStepExplore(e.key === 'ArrowRight' ? 'next' : 'prev');
  return true;
}
