import { useEffect } from 'react';
import * as Tone from 'tone';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { useMidiStore } from '../../stores/useMidiStore';
import { isEditableTarget } from '../../utils/crossRealmDom';
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
  selectedStepIndices?: number[];
  isMultiSelectActive?: boolean;
  onClearStepSelection?: () => void;
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
  selectedStepIdx, selectedStepIndices = [], isMultiSelectActive = false,
  onClearStepSelection, activeTool, setActiveTool, handleClose, onKeyDown,
  puxTrack, coroTrack, isCoroActive, handleSwitchVocalTrack,
}: UseInstrumentEditorKeyboardParams) {
  const hostWin = useWindow();

  useEffect(() => {
    const hostDoc = hostWin?.document || document;
    const onKey = (e: KeyboardEvent) => {
      if (isSettingsOpen || useSequencerSettingsStore.getState().isSettingsOpen || e.defaultPrevented) return;
      const activeEl = hostDoc.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isPercCell = Boolean(activeEl?.classList?.contains('step-input-cell') || target?.classList?.contains('step-input-cell'));
      const isTextEntry = !isPercCell && (isEditableTarget(activeEl) || isEditableTarget(target));

      if (isTextEntry) {
        if (e.key === 'Escape') { e.preventDefault(); activeEl?.blur?.(); target?.blur?.(); }
        return;
      }

      if (e.key === 'Escape') {
        if (hostDoc.querySelector('[data-testid="custom-dialog-backdrop"]')) return;
        const midi = useMidiStore.getState();
        if (midi.waitingForMidiStroke) {
          e.preventDefault();
          midi.setWaitingForMidiStroke(null);
          midi.setMidiLearnActive(false);
          return;
        }
        const hasRange = Boolean(useSequencerStore.getState().selectedStepRange);
        if (isMultiSelectActive || selectedStepIndices.length > 0 || selectedStepIdx !== null || hasRange) {
          e.preventDefault();
          if (isPercCell) activeEl?.blur?.();
          onClearStepSelection?.();
          return;
        }
        const ws = useDesktopWorkspaceStore.getState();
        if (ws.isSatelliteOpen && ws.satelliteMode === 'editor') return;
        e.preventDefault(); handleClose(); return;
      }

      if (e.key === 'Tab' && isVocalContext && puxTrack && coroTrack) {
        e.preventDefault();
        handleSwitchVocalTrack(isCoroActive ? puxTrack : coroTrack);
        return;
      }

      const isCell = Boolean(activeEl?.closest?.('.step-boxes') || isPercCell || target?.closest?.('.step-boxes'));
      if (isCell || selectedStepIdx !== null || isVocalContext || (track as any)?.type === 'voice' || inst?.type === 'voice') {
        onKeyDown?.(e);
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 'up' : 'down';
        const nextTool = getWheelNuanceState(activeTool, dir, inst.id, inst.type, lang, isLeftHanded);
        if (nextTool && String(nextTool) !== activeTool) {
          const toolStr = String(nextTool);
          setActiveTool(toolStr);
          const isAlfaia = ['marcante', 'meiao', 'repique'].includes(inst.id);
          if (toolStr !== '0' && audioEngine && track) {
            try { audioEngine.playNote(track.id, toolStr, Tone.now(), isAlfaia ? 0.7 : (dir === 'down' ? 0.6 : 0.95), isAlfaia ? 1.0 : (dir === 'down' ? 0.8 : 1.0)); } catch (_) {}
          }
        }
        return;
      }

      if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault(); setActiveTool('0'); return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        const pairs = getStrokePairs(inst.id, inst.type, lang, isLeftHanded);
        const char = e.key, isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
        const pair = pairs.find((p) => (
          p.id.toLowerCase() === char.toLowerCase() || p.strong.shortcut.toLowerCase() === char.toLowerCase() ||
          p.strong.symbol.toLowerCase() === char.toLowerCase() || p.strokes.some((s) => s.symbol.toLowerCase() === char.toLowerCase() || s.shortcut.toLowerCase() === char.toLowerCase())
        ));
        if (pair) {
          e.preventDefault();
          const exact = pair.strokes.find((s) => s.symbol === char || s.shortcut === char);
          const ci = exact ?? pair.strokes.find((s) => s.symbol.toLowerCase() === char.toLowerCase() || s.shortcut.toLowerCase() === char.toLowerCase());
          const sym = ci ? ci.symbol : (isUpper ? pair.strong.symbol : (pair.weak ? pair.weak.symbol : pair.strong.symbol));
          const isAlfaia = ['marcante', 'meiao', 'repique'].includes(inst.id);
          const isWeak = !isUpper && !((inst.id === 'caixa' || inst.id === 'tarol') && sym === 'a') && sym === pair.weak?.symbol;
          setActiveTool(sym);
          if (audioEngine && track) {
            try { audioEngine.playNote(track.id, sym, Tone.now(), isAlfaia ? 0.7 : (isWeak ? 0.6 : 0.95), isAlfaia ? 1.0 : (isWeak ? 0.8 : 1.0)); } catch (_) {}
          }
          return;
        }
      }
      onKeyDown?.(e);
    };

    hostDoc.addEventListener('keydown', onKey);
    return () => hostDoc.removeEventListener('keydown', onKey);
  }, [hostWin, handleClose, onKeyDown, selectedStepIdx, selectedStepIndices, isMultiSelectActive, onClearStepSelection, isSettingsOpen, activeTool, inst.id, inst.type, lang, isLeftHanded, track, isVocalContext, isCoroActive, puxTrack, coroTrack, handleSwitchVocalTrack, setActiveTool]);
}
