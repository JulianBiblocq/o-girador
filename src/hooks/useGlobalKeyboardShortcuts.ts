/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { inputManager } from './useAudioSync';

export function useGlobalKeyboardShortcuts() {
  const audio = useAudio();
  const sequencer = useSequencer();

  const { handleTogglePlay } = audio;
  const { handleUndo, handleRedo } = sequencer;

  // InputManager Keyboard Listeners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (inputManager) inputManager.handleKeyDown(e);
    };
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (inputManager) inputManager.handleKeyUp(e);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  // Global modifiers: Undo, Redo, Copy, Paste, Cut, Select All
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((window as any).oGiradorDetailEditorOpen) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      const key = e.key.toLowerCase();
      
      switch (key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            if (handleRedo) handleRedo();
          } else {
            if (handleUndo) handleUndo();
          }
          break;
        case 'a':
        case 'x':
        case 'c':
        case 'v':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('grid-shortcut', { detail: { key } }));
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Space play/pause and alternative Ctrl+Z/Y keydowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const activeId = document.activeElement?.id;

      if (
        activeTag === 'INPUT' ||
        activeTag === 'SELECT' ||
        activeTag === 'TEXTAREA' ||
        activeId === 'letras-textarea'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }

      if ((window as any).oGiradorDetailEditorOpen) return;

      const isUndoKey = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      const isRedoKey = 
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey));
      
      if (isUndoKey) {
        e.preventDefault();
        handleUndo();
      } else if (isRedoKey) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleUndo, handleRedo]);
}
