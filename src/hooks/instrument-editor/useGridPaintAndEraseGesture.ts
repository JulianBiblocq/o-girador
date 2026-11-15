/**
 * useGridPaintAndEraseGesture.ts — Geste atomique clic/glissement Peinture & Gomme (1 seul Undo) (< 125 lignes).
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useWindow } from '../../contexts/WindowContext';
import { getAlternatingStroke } from '../../utils/instrumentStrokes';
import { playGridStepPreview } from './playGridStepPreview';
import { readFreshStepState, computeErasedStepResult, computePaintedStepResult } from './gridStepMutationHelpers';

interface UseGridPaintAndEraseGestureParams {
  trackId: number;
  patternId: number;
  instrument: { id: string; type: string; [key: string]: any };
  activeTool: string;
  isAlternating: boolean;
  lang: string;
  isLeftHanded: boolean;
  onCommitStep: (
    idx: number, finalVal: string | number | [string, string],
    variationId: string | null, options?: { skipUndo?: boolean }
  ) => void;
  onSelectCell?: (idx: number, subIndex: 0 | 1 | null, variationId: string | null) => void;
}

export function useGridPaintAndEraseGesture(params: UseGridPaintAndEraseGestureParams) {
  const { trackId, patternId, instrument, activeTool, isAlternating, lang, isLeftHanded, onCommitStep, onSelectCell } = params;
  const hostWin = useWindow();

  const pointerModeRef = useRef<'idle' | 'paint' | 'erase'>('idle');
  const gestureUndoPushedRef = useRef(false);
  const pendingToggleClearRef = useRef<{ idx: number; subIndex?: 0 | 1; variationId: string | null } | null>(null);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const isAlternatingRef = useRef(isAlternating);
  isAlternatingRef.current = isAlternating;

  const ensureGestureUndo = useCallback(() => {
    if (!gestureUndoPushedRef.current) {
      useSequencerStore.getState().pushUndoState();
      gestureUndoPushedRef.current = true;
    }
  }, []);

  const eraseStepAt = useCallback((idx: number, subIndex: 0 | 1 | undefined, variationId: string | null) => {
    const { rawVal } = readFreshStepState(trackId, patternId, variationId, idx);
    const res = computeErasedStepResult(rawVal, subIndex);
    if (!res.changed) return;
    ensureGestureUndo();
    onCommitStep(idx, res.finalVal, variationId, { skipUndo: true });
    onSelectCell?.(idx, res.nextSub, variationId);
  }, [trackId, patternId, ensureGestureUndo, onCommitStep, onSelectCell]);

  const applyPaintCell = useCallback((idx: number, subIndex: 0 | 1 | undefined, variationId: string | null, stroke: string | number) => {
    const { ptn, rawVal } = readFreshStepState(trackId, patternId, variationId, idx);
    const res = computePaintedStepResult(rawVal, stroke, subIndex);
    if (!res.changed) return;
    ensureGestureUndo();
    onCommitStep(idx, res.finalVal, variationId, { skipUndo: true });
    onSelectCell?.(idx, res.nextSub, variationId);
    if (res.normTarget !== '0' && ptn) playGridStepPreview(trackId, ptn, res.normTarget, idx, subIndex);
  }, [trackId, patternId, ensureGestureUndo, onCommitStep, onSelectCell]);

  useEffect(() => {
    const flushAndReset = (e: MouseEvent) => {
      const pending = pendingToggleClearRef.current;
      if (e.button === 0 && pending && pointerModeRef.current === 'paint') {
        applyPaintCell(pending.idx, pending.subIndex, pending.variationId, 0);
      }
      pointerModeRef.current = 'idle';
      gestureUndoPushedRef.current = false;
      pendingToggleClearRef.current = null;
    };
    const cancelOnly = () => {
      pointerModeRef.current = 'idle';
      gestureUndoPushedRef.current = false;
      pendingToggleClearRef.current = null;
    };
    hostWin.addEventListener('mouseup', flushAndReset);
    hostWin.addEventListener('pointercancel', cancelOnly);
    hostWin.addEventListener('blur', cancelOnly);
    return () => {
      hostWin.removeEventListener('mouseup', flushAndReset);
      hostWin.removeEventListener('pointercancel', cancelOnly);
      hostWin.removeEventListener('blur', cancelOnly);
    };
  }, [hostWin, applyPaintCell]);

  const beginPaintOrToggle = useCallback((idx: number, subIndex: 0 | 1 | undefined, variationId: string | null) => {
    gestureUndoPushedRef.current = false;
    pendingToggleClearRef.current = null;
    const tool = activeToolRef.current;
    if (!tool || tool === '0' || tool === '') {
      pointerModeRef.current = 'erase';
      eraseStepAt(idx, subIndex, variationId);
      return;
    }
    pointerModeRef.current = 'paint';
    const isAlt = (tool === 'D' || tool === 'E') && isAlternatingRef.current;
    const stroke = isAlt ? getAlternatingStroke(idx, tool, instrument?.id, instrument?.type, lang, isLeftHanded) : tool;
    const { rawVal } = readFreshStepState(trackId, patternId, variationId, idx);
    const curSub = Array.isArray(rawVal) ? rawVal[subIndex ?? 0] : rawVal;
    if (!isAlt && String(curSub ?? '0').trim() === String(stroke)) {
      pendingToggleClearRef.current = { idx, subIndex, variationId };
      onSelectCell?.(idx, Array.isArray(rawVal) ? (subIndex ?? 0) : null, variationId);
      return;
    }
    applyPaintCell(idx, subIndex, variationId, stroke);
  }, [instrument?.id, instrument?.type, lang, isLeftHanded, trackId, patternId, eraseStepAt, applyPaintCell, onSelectCell]);

  const continueGestureOnEnter = useCallback((idx: number, e: React.MouseEvent | undefined, subIndex: 0 | 1 | undefined, variationId: string | null) => {
    const buttons = e?.buttons ?? 0;
    if (buttons === 2 || (pointerModeRef.current === 'erase' && (buttons & 3) !== 0)) {
      pointerModeRef.current = 'erase';
      eraseStepAt(idx, subIndex, variationId);
      return;
    }
    if (pointerModeRef.current !== 'paint' || (buttons & 1) === 0) return;
    const tool = activeToolRef.current;
    if (!tool || tool === 'scissors') return;
    const pending = pendingToggleClearRef.current;
    if (pending && (pending.idx !== idx || pending.subIndex !== subIndex || pending.variationId !== variationId)) {
      pendingToggleClearRef.current = null;
    }
    const isAlt = (tool === 'D' || tool === 'E') && isAlternatingRef.current;
    const stroke = isAlt ? getAlternatingStroke(idx, tool, instrument?.id, instrument?.type, lang, isLeftHanded) : tool;
    applyPaintCell(idx, subIndex, variationId, stroke);
  }, [instrument?.id, instrument?.type, lang, isLeftHanded, eraseStepAt, applyPaintCell]);

  const beginErase = useCallback((idx: number, subIndex: 0 | 1 | undefined, variationId: string | null) => {
    gestureUndoPushedRef.current = false;
    pendingToggleClearRef.current = null;
    pointerModeRef.current = 'erase';
    eraseStepAt(idx, subIndex, variationId);
  }, [eraseStepAt]);

  return { pointerModeRef, beginPaintOrToggle, continueGestureOnEnter, beginErase, eraseStepAt };
}
