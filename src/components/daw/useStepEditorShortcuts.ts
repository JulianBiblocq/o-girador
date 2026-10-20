import { useEffect } from 'react';
import { useWindow } from '../../contexts/WindowContext';

interface UseStepEditorShortcutsProps {
  activeStepKey: string | null;
  trackId: number | null;
  patternId: number | null;
  stepIdx: number | null;
  allowedStrokes: (string | number)[];
  popupRef: React.RefObject<HTMLDivElement | null>;
  closeEditor: () => void;
  handleSelectStroke: (s: string | number) => void;
  handleSilence: () => void;
}

export function useStepEditorShortcuts({
  activeStepKey,
  trackId,
  patternId,
  stepIdx,
  allowedStrokes,
  popupRef,
  closeEditor,
  handleSelectStroke,
  handleSilence,
}: UseStepEditorShortcutsProps) {
  const currentWindow = useWindow();

  useEffect(() => {
    if (!activeStepKey || trackId === null || patternId === null || stepIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      const key = e.key;
      if (key === 'Escape') {
        closeEditor();
        return;
      }

      if (key === '0' || key === 'Backspace' || key === 'Delete' || key === '-') {
        e.preventDefault();
        handleSilence();
        return;
      }

      const targetStroke = allowedStrokes.find(s => String(s).toLowerCase() === key.toLowerCase());
      if (targetStroke) {
        e.preventDefault();
        handleSelectStroke(targetStroke);
      }
    };

    currentWindow.addEventListener('keydown', handleKeyDown);
    return () => currentWindow.removeEventListener('keydown', handleKeyDown);
  }, [activeStepKey, trackId, patternId, stepIdx, allowedStrokes, closeEditor, handleSelectStroke, handleSilence, currentWindow]);

  useEffect(() => {
    if (!activeStepKey) return;
    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closeEditor();
      }
    };

    currentWindow.addEventListener('mousedown', handleMouseDown);
    currentWindow.addEventListener('touchstart', handleMouseDown);
    return () => {
      currentWindow.removeEventListener('mousedown', handleMouseDown);
      currentWindow.removeEventListener('touchstart', handleMouseDown);
    };
  }, [activeStepKey, closeEditor, currentWindow, popupRef]);
}
