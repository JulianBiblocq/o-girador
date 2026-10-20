import { useEffect, useRef } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { handleTimelineClipboardKeyDown } from './timeline/useTimelineClipboardShortcuts';
import { handleTimelineNavigationKeyDown } from './timeline/useTimelineNavigationShortcuts';

interface UseTimelineShortcutsOptions {
  onToggleViewMode?: () => void;
  onCloseEditor?: () => void;
}

function isActualTextEntry(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    const textTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];
    return textTypes.includes(type) && !el.readOnly && !el.disabled;
  }
  return false;
}

export function useTimelineShortcuts(options?: UseTimelineShortcutsOptions) {
  const audio = useAudio();
  const sequencer = useSequencer();
  const { handleTimelineNavigate, seekToMeasure } = audio;
  const { handleUndo, handleRedo, setIsLooping } = sequencer;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isTextEntry = isActualTextEntry(target) || isActualTextEntry(activeEl);

      if (isTextEntry && e.key === 'Escape') {
        e.preventDefault();
        activeEl?.blur();
        target?.blur();
        return;
      }

      const handledNav = handleTimelineNavigationKeyDown(e, isTextEntry, {
        seekToMeasure,
        handleTimelineNavigate,
        setIsLooping,
        handleUndo,
        handleRedo,
        onToggleViewMode: optionsRef.current?.onToggleViewMode,
        onCloseEditor: optionsRef.current?.onCloseEditor,
      });
      if (handledNav) return;

      handleTimelineClipboardKeyDown(e, isTextEntry);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTimelineNavigate, seekToMeasure, handleUndo, handleRedo, setIsLooping]);
}
