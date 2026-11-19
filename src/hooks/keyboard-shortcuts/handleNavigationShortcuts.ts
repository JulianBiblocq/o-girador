
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { getLiveOrStoreMeasure } from '../../audio/visualTickBuffer';
import { isActualTextEntry } from './isActualTextEntry';
import { hasOpenBlockingModalOrEditor, isRodaViewCurrentlyActive } from './rodaStepExploreGuard';

interface NavigationShortcutsParams {
  e: KeyboardEvent;
  handleRewind?: () => void;
  seekToMeasure?: (measure: number, step?: number) => void;
  handleTimelineNavigate?: (m: number, s: number, stepsPerMeasure?: number) => void;
  setIsLooping?: (l: boolean) => void;
}

export function handleNavigationShortcuts({
  e,
  handleRewind,
  seekToMeasure,
  handleTimelineNavigate,
  setIsLooping,
}: NavigationShortcutsParams): boolean {
  // Tab : Bascule Roda / Timeline
  if (e.key === 'Tab') {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('toggle-view-mode'));
    return true;
  }

  // Entrée ou Home : retour au début (boucle ou Mesure 1)
  if (e.key === 'Enter' || e.key === 'Home') {
    if (isActualTextEntry(document.activeElement as HTMLElement | null)) return false;
    e.preventDefault();
    if (handleRewind) handleRewind();
    else if (seekToMeasure) seekToMeasure(0, 0);
    else if (handleTimelineNavigate) handleTimelineNavigate(0, 0, 16);
    return true;
  }

  // Ctrl+Shift+I : Ouvrir l'Atelier Papier Cordel
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-paper-workshop', { detail: { tab: 'reserve' } }));
    return true;
  }

  // O : toggle settings
  if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    useSequencerSettingsStore.getState().toggleSettings();
    return true;
  }

  // L : boucle
  if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    const nextLoop = !useSequencerStore.getState().isLooping;
    useSequencerStore.getState().setIsLooping(nextLoop);
    if (setIsLooping) setIsLooping(nextLoop);
    return true;
  }

  // Navigation par Mesures (ArrowLeft / ArrowRight : réservé hors Roda et hors modale/éditeur)
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (isActualTextEntry(document.activeElement as HTMLElement | null)) return false;
    if (isRodaViewCurrentlyActive(false) || hasOpenBlockingModalOrEditor(document)) return false;
    e.preventDefault();
    const curM = getLiveOrStoreMeasure(useSequencerStore.getState().currentMeasure);
    const totalM = useSequencerStore.getState().totalMeasures;
    const delta = e.shiftKey ? 4 : 1;
    const targetM = e.key === 'ArrowLeft' ? Math.max(0, curM - delta) : Math.min(totalM - 1, curM + delta);
    if (seekToMeasure) seekToMeasure(targetM, 0);
    else if (handleTimelineNavigate) handleTimelineNavigate(targetM, 0, 16);
    return true;
  }

  // Touches complémentaires DAW (< / , / - / + / > / .)
  const isPrevMeasureKey = e.key === '<' || e.key === ',' || e.code === 'NumpadSubtract' || (e.key === '-' && !e.ctrlKey && !e.metaKey);
  const isNextMeasureKey = e.key === '>' || e.key === '.' || e.code === 'NumpadAdd' || (e.key === '+' && !e.ctrlKey && !e.metaKey);
  if (isPrevMeasureKey || isNextMeasureKey) {
    if (isActualTextEntry(document.activeElement as HTMLElement | null)) return false;
    e.preventDefault();
    const curM = getLiveOrStoreMeasure(useSequencerStore.getState().currentMeasure);
    const totalM = useSequencerStore.getState().totalMeasures;
    const targetM = isPrevMeasureKey ? Math.max(0, curM - 1) : Math.min(totalM - 1, curM + 1);
    if (seekToMeasure) seekToMeasure(targetM, 0);
    else if (handleTimelineNavigate) handleTimelineNavigate(targetM, 0, 16);
    return true;
  }

  return false;
}
