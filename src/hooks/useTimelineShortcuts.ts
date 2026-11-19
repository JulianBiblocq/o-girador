import { useEffect, useRef } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { isEditableTarget } from '../utils/crossRealmDom';
import { handleTimelineClipboardKeyDown } from './timeline/useTimelineClipboardShortcuts';
import { handleTimelineNavigationKeyDown } from './timeline/useTimelineNavigationShortcuts';

interface UseTimelineShortcutsOptions {
  onToggleViewMode?: () => void;
  onCloseEditor?: () => void;
}

export function useTimelineShortcuts(options?: UseTimelineShortcutsOptions) {
  const audio = useAudio();
  const sequencer = useSequencer();
  const { handleRewind, handleTimelineNavigate, seekToMeasure } = audio;
  const { handleUndo, handleRedo, setIsLooping } = sequencer;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isTextEntry = isEditableTarget(target) || isEditableTarget(activeEl);

      if (isTextEntry && e.key === 'Escape') {
        e.preventDefault();
        activeEl?.blur();
        target?.blur();
        return;
      }

      const handledNav = handleTimelineNavigationKeyDown(e, isTextEntry, {
        handleRewind,
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
  }, [handleRewind, handleTimelineNavigate, seekToMeasure, handleUndo, handleRedo, setIsLooping]);
}
