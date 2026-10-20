import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

interface NavigationShortcutDeps {
  seekToMeasure?: (mIdx: number, sIdx?: number) => void;
  handleTimelineNavigate?: (mIdx: number, sIdx: number, steps: number) => void;
  setIsLooping?: (val: boolean) => void;
  handleUndo?: () => void;
  handleRedo?: () => void;
  onToggleViewMode?: () => void;
  onCloseEditor?: () => void;
}

export function handleTimelineNavigationKeyDown(
  e: KeyboardEvent,
  isTextEntry: boolean,
  deps: NavigationShortcutDeps
): boolean {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (typeof (window as any).oGiradorDetailEditorClose === 'function') { (window as any).oGiradorDetailEditorClose(); return true; }
    if (deps.onCloseEditor) { deps.onCloseEditor(); return true; }
    if (useSequencerSettingsStore.getState().isSettingsOpen) { useSequencerSettingsStore.getState().setIsSettingsOpen(false); return true; }
    useSequencerStore.getState().clearTimelineSelection();
    useSequencerStore.getState().clearAutomationSelection();
    window.dispatchEvent(new CustomEvent('close-popups'));
    return true;
  }

  if (isTextEntry) return false;

  if (e.key === 'Tab') {
    e.preventDefault();
    if (deps.onToggleViewMode) deps.onToggleViewMode();
    else window.dispatchEvent(new CustomEvent('toggle-view-mode'));
    return true;
  }

  if (e.key === 'Enter' || e.key === 'Home') {
    e.preventDefault();
    if (deps.seekToMeasure) deps.seekToMeasure(0, 0);
    else deps.handleTimelineNavigate?.(0, 0, 16);
    return true;
  }

  if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); useSequencerSettingsStore.getState().toggleSettings(); return true;
  }

  if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    const nextLoop = !useSequencerStore.getState().isLooping;
    useSequencerStore.getState().setIsLooping(nextLoop);
    deps.setIsLooping?.(nextLoop);
    return true;
  }

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const curM = useSequencerStore.getState().currentMeasure, totalM = useSequencerStore.getState().totalMeasures;
    const delta = e.shiftKey ? 4 : 1;
    const targetM = e.key === 'ArrowLeft' ? Math.max(0, curM - delta) : Math.min(totalM - 1, curM + delta);
    if (deps.seekToMeasure) deps.seekToMeasure(targetM, 0);
    else deps.handleTimelineNavigate?.(targetM, 0, 16);
    return true;
  }

  const isPrevKey = e.key === '<' || e.key === ',' || e.code === 'NumpadSubtract' || (e.key === '-' && !e.ctrlKey && !e.metaKey);
  const isNextKey = e.key === '>' || e.key === '.' || e.code === 'NumpadAdd' || (e.key === '+' && !e.ctrlKey && !e.metaKey);
  if (isPrevKey || isNextKey) {
    e.preventDefault();
    const curM = useSequencerStore.getState().currentMeasure, totalM = useSequencerStore.getState().totalMeasures;
    const targetM = isPrevKey ? Math.max(0, curM - 1) : Math.min(totalM - 1, curM + 1);
    if (deps.seekToMeasure) deps.seekToMeasure(targetM, 0);
    else deps.handleTimelineNavigate?.(targetM, 0, 16);
    return true;
  }

  const isUndo = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
  const isRedo = ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) || ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey));
  if (isUndo) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (deps.handleUndo) deps.handleUndo(); else useSequencerStore.getState().handleUndo();
    return true;
  }
  if (isRedo) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (deps.handleRedo) deps.handleRedo(); else useSequencerStore.getState().handleRedo();
    return true;
  }

  return false;
}
