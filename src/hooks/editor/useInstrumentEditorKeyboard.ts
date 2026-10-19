/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import * as Tone from 'tone';
import { getStrokePairs, getWheelNuanceState } from '../../utils/instrumentStrokes';
import { audioEngine } from '../useAudioSync';

export interface UseInstrumentEditorKeyboardParams {
  isSettingsOpen: boolean;
  isVocalContext: boolean;
  track: any;
  inst: { id: string; type: string };
  lang: string;
  isLeftHanded: boolean;
  selectedStepIdx: number | null;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  handleClose: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  puxTrack?: any;
  coroTrack?: any;
  isCoroActive?: boolean;
  handleSwitchVocalTrack: (target: any) => void;
}

export function useInstrumentEditorKeyboard({
  isSettingsOpen, isVocalContext, track, inst, lang, isLeftHanded,
  selectedStepIdx, activeTool, setActiveTool, handleClose, onKeyDown,
  puxTrack, coroTrack, isCoroActive, handleSwitchVocalTrack,
}: UseInstrumentEditorKeyboardParams) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isSettingsOpen || e.defaultPrevented) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      const isTextEntry = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' ||
        Boolean(activeEl?.isContentEditable) || target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement || Boolean(target?.isContentEditable) ||
        Boolean(activeEl?.classList?.contains('v-syl')) || Boolean(target?.classList?.contains('v-syl'));

      if (isTextEntry) {
        if (e.key === 'Escape') { e.preventDefault(); activeEl?.blur(); target?.blur(); }
        return;
      }

      if (e.key === 'Escape') {
        if (document.querySelector('[data-testid="custom-dialog-backdrop"]')) return;
        e.preventDefault(); handleClose(); return;
      }

      if (e.key === 'Tab' && isVocalContext && puxTrack && coroTrack) {
        e.preventDefault();
        handleSwitchVocalTrack(isCoroActive ? puxTrack : coroTrack);
        return;
      }

      const isCell = Boolean(activeEl?.closest?.('.step-boxes') || activeEl?.closest?.('.step-input-cell') || target?.closest?.('.step-boxes') || target?.closest?.('.step-input-cell'));
      if (isCell || selectedStepIdx !== null) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      if (isVocalContext || (track as any)?.type === 'voice' || inst?.type === 'voice') {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 'up' : 'down';
        const nextTool = getWheelNuanceState(activeTool, dir, inst.id, inst.type, lang, isLeftHanded);
        if (nextTool && String(nextTool) !== activeTool) {
          const toolStr = String(nextTool);
          setActiveTool(toolStr);
          if (toolStr !== '0' && audioEngine && track) {
            try { audioEngine.playNote(track.id, toolStr, Tone.now(), dir === 'down' ? 0.6 : 0.95, dir === 'down' ? 0.8 : 1.0); } catch (_) {}
          }
        }
        return;
      }

      if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault(); setActiveTool('0'); return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        const pairs = getStrokePairs(inst.id, inst.type, lang, isLeftHanded);
        const char = e.key;
        const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();

        const matchingPair = pairs.find((p) => (
          p.id.toLowerCase() === char.toLowerCase() || p.strong.shortcut.toLowerCase() === char.toLowerCase() ||
          p.strong.symbol.toLowerCase() === char.toLowerCase() || p.strokes.some((s) => s.symbol.toLowerCase() === char.toLowerCase() || s.shortcut.toLowerCase() === char.toLowerCase())
        ));

        if (matchingPair) {
          e.preventDefault();
          const isWeak = !isUpper && Boolean(matchingPair.weak);
          const targetSymbol = isUpper ? matchingPair.strong.symbol : (matchingPair.weak ? matchingPair.weak.symbol : matchingPair.strong.symbol);
          setActiveTool(targetSymbol);
          if (audioEngine && track) {
            try { audioEngine.playNote(track.id, targetSymbol, Tone.now(), isWeak ? 0.6 : 0.95, isWeak ? 0.8 : 1.0); } catch (_) {}
          }
          return;
        }

        const upperChar = char.toUpperCase();
        if (['B', 'C', 'X'].includes(upperChar)) {
          const allSymbols = pairs.flatMap((p) => p.strokes.map((s) => s.symbol));
          if (allSymbols.includes(upperChar) || allSymbols.includes(char.toLowerCase())) {
            e.preventDefault();
            const symbolToSelect = (isUpper || !allSymbols.includes(char.toLowerCase())) ? upperChar : char.toLowerCase();
            setActiveTool(symbolToSelect);
            if (audioEngine && track) {
              try { audioEngine.playNote(track.id, symbolToSelect, Tone.now(), isUpper ? 0.95 : 0.6, isUpper ? 1.0 : 0.8); } catch (_) {}
            }
            return;
          }
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose, onKeyDown, selectedStepIdx, isSettingsOpen, activeTool, inst.id, inst.type, lang, isLeftHanded, track, isVocalContext, isCoroActive, puxTrack, coroTrack, handleSwitchVocalTrack, setActiveTool]);
}
