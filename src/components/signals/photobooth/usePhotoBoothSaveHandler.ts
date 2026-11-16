import React from 'react';
import { CordelOptions, defaultCordelOptions } from '../../../utils/cordelEffect';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { GallerySignalItem } from '../../mobile/editor/MobileMestreSignalCard';

interface UsePhotoBoothSaveHandlerArgs {
  lang: 'fr' | 'pt';
  signalName: string;
  setSignalName: (val: string) => void;
  editingSignalId: string | null;
  setEditingSignalId: (id: string | null) => void;
  beatsCount: number;
  setBeatsCount: (count: number) => void;
  rawBase64ImagesRef: React.MutableRefObject<string[]>;
  reprocess: {
    processedFrames: string[];
    cordelOptions: CordelOptions;
    frameOverrides: Record<number, Partial<CordelOptions>>;
    setCordelOptions: (opts: CordelOptions) => void;
    setFrameOverrides: (ov: Record<number, Partial<CordelOptions>>) => void;
    setProcessedFrames: (frames: string[]) => void;
    setSelectedFrameIndex: (idx: number) => void;
  };
  setPhase: (phase: 'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review') => void;
  setActiveTab: (tab: 'capture' | 'gallery') => void;
  onSave: (signal: any) => void | Promise<void>;
  onClose: () => void;
}

export function usePhotoBoothSaveHandler({
  lang, signalName, setSignalName, editingSignalId, setEditingSignalId,
  beatsCount, setBeatsCount, rawBase64ImagesRef, reprocess, setPhase, setActiveTab, onSave, onClose,
}: UsePhotoBoothSaveHandlerArgs) {
  const handlePickFromGallery = (sig: GallerySignalItem) => {
    const resolvedFrames = (sig.frames?.length ? sig.frames : [sig.image || sig.imageUrl])
      .filter((f): f is string => Boolean(f));
    if (!resolvedFrames.length) return;

    setEditingSignalId(sig.id);
    setSignalName(sig.name || (lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre'));
    setBeatsCount(sig.beatsCount || resolvedFrames.length || 1);
    rawBase64ImagesRef.current = sig.rawFrames?.length ? [...sig.rawFrames] : [...resolvedFrames];
    reprocess.setCordelOptions({ ...defaultCordelOptions, ...(sig.cordelOptions || {}) });
    reprocess.setFrameOverrides(sig.frameOverrides ? { ...sig.frameOverrides } : {});
    reprocess.setProcessedFrames(resolvedFrames);
    reprocess.setSelectedFrameIndex(0);
    setPhase('review');
    setActiveTab('capture');
  };

  const handleSaveSignal = async () => {
    if (reprocess.processedFrames.length === 0) return;
    const cleanName = signalName.trim() || (lang === 'fr' ? 'Signal' : 'Sinal');
    const payload = {
      name: cleanName,
      image: reprocess.processedFrames[0],
      frames: reprocess.processedFrames,
      rawFrames: rawBase64ImagesRef.current,
      cordelOptions: reprocess.cordelOptions,
      frameOverrides: reprocess.frameOverrides,
      beatsCount,
      mirrorHorizontal: reprocess.cordelOptions.isMirror,
      id: editingSignalId || undefined,
    };

    if (editingSignalId) {
      const store = useSequencerStore.getState();
      const isLocal = Boolean(store.metadata?.rhythmSignals?.some((s) => s.id === editingSignalId));
      if (isLocal && store.metadata) {
        store.setMetadata({
          ...store.metadata,
          rhythmSignals: (store.metadata.rhythmSignals || []).map((s) =>
            s.id === editingSignalId ? { ...s, ...payload, id: editingSignalId } : s
          ),
        });
        await onSave({ ...payload, id: editingSignalId, isLocalSignal: true });
      } else {
        store.setMestreSignals(
          (store.mestreSignals || []).map((s) =>
            s.id === editingSignalId ? { ...s, ...payload, id: editingSignalId, imageUrl: payload.image } : s
          )
        );
        try {
          const { updateMestreSignal } = await import('../../../services/cloud-signals/mestreSignalsMutations');
          await updateMestreSignal(editingSignalId, payload);
        } catch {}
        await onSave({ ...payload, id: editingSignalId });
      }
      setEditingSignalId(null);
      setPhase('idle');
      setActiveTab('gallery');
      return;
    }

    await onSave(payload);
    onClose();
  };

  return { handlePickFromGallery, handleSaveSignal };
}
