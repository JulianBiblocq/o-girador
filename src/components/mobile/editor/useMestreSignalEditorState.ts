/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hook d'état et de synchronisation pour l'éditeur Signes du Mestre (< 95 lignes).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { defaultCordelOptions, CordelOptions, processCordelEffectBase64, compressRawFrameForArchive } from '../../../utils/cordelEffect';
import { uploadMestreSignal, updateMestreSignal } from '../../../services/cloud-signals/mestreSignalsMutations';
import { CloudRhythmSignal } from '../../../types';

export function useMestreSignalEditorState(mode: 'single' | 'four' | 'batch', setMode: (m: 'single' | 'four' | 'batch') => void, name: string, setName: (n: string) => void) {
  const mestreSignals = useSequencerStore((s) => s.mestreSignals);
  const setMestreSignals = useSequencerStore((s) => s.setMestreSignals);
  const { userProfile, currentUser } = useAuth();

  const [rawImages, setRawImages] = useState<string[]>([]);
  const [previewImgs, setPreviewImgs] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSignalId, setEditingSignalId] = useState<string | null>(null);
  const [globalOptions, setGlobalOptions] = useState<CordelOptions>({ ...defaultCordelOptions });
  const [frameOverrides, setFrameOverrides] = useState<Record<number, Partial<CordelOptions>>>({});
  const reprocessRequestIdRef = useRef(0);

  const effectiveOptions = { ...globalOptions, ...(frameOverrides[selectedFrame] || {}) };

  const handleUpdateOptions = useCallback((patch: Partial<CordelOptions>) => {
    if (frameOverrides[selectedFrame]) {
      setFrameOverrides((p) => ({ ...p, [selectedFrame]: { ...(p[selectedFrame] || {}), ...patch } }));
    } else {
      setGlobalOptions((p) => ({ ...p, ...patch }));
    }
  }, [selectedFrame, frameOverrides]);

  const toggleFrameOverride = () => {
    setFrameOverrides((p) => {
      const n = { ...p };
      if (n[selectedFrame]) delete n[selectedFrame]; else n[selectedFrame] = { ...globalOptions };
      return n;
    });
  };

  useEffect(() => {
    const raw = rawImages[selectedFrame] || rawImages[0];
    if (!raw) return;
    const reqId = ++reprocessRequestIdRef.current;
    const timer = setTimeout(() => {
      processCordelEffectBase64(raw, effectiveOptions, 380).then((res) => {
        if (reqId === reprocessRequestIdRef.current) {
          setPreviewImgs((prev) => { const n = [...prev]; n[selectedFrame] = res; return n; });
        }
      });
    }, 45);
    return () => clearTimeout(timer);
  }, [rawImages, selectedFrame, effectiveOptions]);

  useEffect(() => {
    if (!isPlaying || rawImages.length <= 1) return;
    const timer = setInterval(() => setSelectedFrame((p) => (p + 1) % rawImages.length), 140);
    return () => clearInterval(timer);
  }, [isPlaying, rawImages.length]);

  const handlePickSignal = (sig: CloudRhythmSignal) => {
    setEditingSignalId(sig.id); setName(sig.name);
    setMode(sig.beatsCount && sig.beatsCount > 1 ? 'four' : 'single');
    setRawImages(sig.rawFrames?.length ? sig.rawFrames : (sig.frames || [sig.image]));
    setGlobalOptions(sig.cordelOptions || defaultCordelOptions);
    setFrameOverrides(sig.frameOverrides || {});
    setSelectedFrame(0);
  };

  const handleNewSignal = () => {
    setEditingSignalId(null); setName(''); setRawImages([]); setPreviewImgs([]); setFrameOverrides({});
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
      handleNewSignal();
    } finally { setIsSaving(false); }
  };

  return {
    rawImages, setRawImages, previewImgs, selectedFrame, setSelectedFrame, isPlaying, setIsPlaying,
    isSaving, editingSignalId, globalOptions, setGlobalOptions, frameOverrides, effectiveOptions,
    handleUpdateOptions, toggleFrameOverride, handlePickSignal, handleNewSignal, handleSave, mestreSignals,
  };
}
