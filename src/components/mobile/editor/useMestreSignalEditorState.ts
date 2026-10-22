/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hook d'état et de synchronisation persistant pour l'éditeur Signes du Mestre (< 120 lignes).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { defaultCordelOptions, CordelOptions, processCordelEffectBase64, compressRawFrameForArchive } from '../../../utils/cordelEffect';
import { uploadMestreSignal, updateMestreSignal } from '../../../services/cloud-signals/mestreSignalsMutations';
import { CloudRhythmSignal } from '../../../types';
import { usePhotoLabDraftStore } from '../../../store/usePhotoLabDraftStore';

export function useMestreSignalEditorState() {
  const mestreSignals = useSequencerStore((s) => s.mestreSignals);
  const setMestreSignals = useSequencerStore((s) => s.setMestreSignals);
  const { userProfile, currentUser } = useAuth();

  const draft = usePhotoLabDraftStore();
  const rawImages = draft.rawFrames;
  const previewImgs = draft.frames;
  const selectedFrame = draft.selectedFrameIndex;
  const globalOptions = draft.cordelOptions;
  const frameOverrides = draft.frameOverrides;
  const editingSignalId = draft.editingSignalId;
  const name = draft.signalName;
  const mode: 'single' | 'four' | 'batch' = draft.beatsCount === 4 ? 'four' : draft.beatsCount === 5 ? 'batch' : 'single';

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const reprocessRequestIdRef = useRef(0);

  const effectiveOptions = { ...globalOptions, ...(frameOverrides[selectedFrame] || {}) };

  const setName = useCallback((n: string) => draft.setSignalName(n), [draft]);
  const setMode = useCallback((m: 'single' | 'four' | 'batch') => {
    draft.setBeatsCount(m === 'four' ? 4 : m === 'batch' ? 5 : 1);
  }, [draft]);
  const setSelectedFrame = useCallback((i: number) => draft.setSelectedFrameIndex(i), [draft]);
  const setRawImages = useCallback((imgs: string[]) => draft.setRawFrames(imgs), [draft]);
  const setGlobalOptions = useCallback((opts: CordelOptions) => draft.setCordelOptions(opts), [draft]);

  const handleUpdateOptions = useCallback((patch: Partial<CordelOptions>) => {
    if (frameOverrides[selectedFrame]) {
      draft.setFrameOverrides({ ...frameOverrides, [selectedFrame]: { ...(frameOverrides[selectedFrame] || {}), ...patch } });
    } else {
      draft.updateCordelOptions(patch);
    }
  }, [selectedFrame, frameOverrides, draft]);

  const toggleFrameOverride = () => {
    const next = { ...frameOverrides };
    if (next[selectedFrame]) delete next[selectedFrame]; else next[selectedFrame] = { ...globalOptions };
    draft.setFrameOverrides(next);
  };

  useEffect(() => {
    const raw = rawImages[selectedFrame] || rawImages[0];
    if (!raw) return;
    const reqId = ++reprocessRequestIdRef.current;
    const timer = setTimeout(() => {
      processCordelEffectBase64(raw, effectiveOptions, 380).then((res) => {
        if (reqId === reprocessRequestIdRef.current) {
          const currentFrames = usePhotoLabDraftStore.getState().frames;
          const next = [...(currentFrames.length >= rawImages.length ? currentFrames : rawImages.map((_, i) => currentFrames[i] || ''))];
          next[selectedFrame] = res;
          draft.setFrames(next);
        }
      });
    }, 45);
    return () => clearTimeout(timer);
  }, [rawImages, selectedFrame, effectiveOptions, draft]);

  useEffect(() => {
    if (!isPlaying || rawImages.length <= 1) return;
    const timer = setInterval(() => draft.setSelectedFrameIndex((selectedFrame + 1) % rawImages.length), 140);
    return () => clearInterval(timer);
  }, [isPlaying, rawImages.length, selectedFrame, draft]);

  const handlePickSignal = (sig: CloudRhythmSignal) => {
    draft.setEditingSignalId(sig.id);
    draft.setSignalName(sig.name);
    draft.setBeatsCount(sig.beatsCount && sig.beatsCount > 1 ? (sig.beatsCount as any) : 1);
    const raws = sig.rawFrames?.length ? sig.rawFrames : (sig.frames || [sig.image]);
    draft.setRawFrames(raws);
    draft.setFrames(sig.frames?.length ? sig.frames : [sig.image]);
    draft.setCordelOptions(sig.cordelOptions || defaultCordelOptions);
    draft.setFrameOverrides(sig.frameOverrides || {});
    draft.setSelectedFrameIndex(0);
  };

  const handleNewSignal = () => {
    draft.resetDraftAfterSave();
  };

  const handleSave = async () => {
    const mestreId = userProfile?.mestreId || currentUser?.uid;
    if (!mestreId || !previewImgs[0] || !name.trim()) return;
    setIsSaving(true);
    try {
      const renderedFrames = await Promise.all(
        rawImages.map((raw, idx) => processCordelEffectBase64(raw, { ...globalOptions, ...(frameOverrides[idx] || {}) }, 380))
      );
      const archivedRaws = await Promise.all(rawImages.map((raw) => compressRawFrameForArchive(raw, 360, 0.6)));
      const beats = mode === 'four' ? Math.max(4, renderedFrames.length) : 1;

      if (editingSignalId) {
        await updateMestreSignal(editingSignalId, {
          name: name.trim(), image: renderedFrames[0], frames: renderedFrames, rawFrames: archivedRaws,
          cordelOptions: globalOptions, frameOverrides, beatsCount: beats, mirrorHorizontal: globalOptions.isMirror,
        });
        setMestreSignals(mestreSignals.map((s) => s.id === editingSignalId ? { ...s, name: name.trim(), image: renderedFrames[0], frames: renderedFrames, rawFrames: archivedRaws, cordelOptions: globalOptions, frameOverrides } : s));
      } else {
        const res = await uploadMestreSignal(mestreId, name.trim(), renderedFrames[0], renderedFrames, beats, globalOptions.isMirror, archivedRaws, globalOptions, frameOverrides);
        if (res.success && res.signal) setMestreSignals([...mestreSignals, res.signal]);
      }
      draft.resetDraftAfterSave();
    } finally { setIsSaving(false); }
  };

  return {
    mode, setMode, name, setName, rawImages, setRawImages, previewImgs, selectedFrame, setSelectedFrame,
    isPlaying, setIsPlaying, isSaving, editingSignalId, globalOptions, setGlobalOptions, frameOverrides,
    effectiveOptions, handleUpdateOptions, toggleFrameOverride, handlePickSignal, handleNewSignal, handleSave, mestreSignals,
  };
}
