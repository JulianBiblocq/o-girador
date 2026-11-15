import React from 'react';
import { CloudRhythmSignal } from '../../../types';
import { CordelOptions } from '../../../utils/cordelEffect';

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
    handleUpdateCordelOptions: (opts: Partial<CordelOptions>) => void;
    setProcessedFrames: (frames: string[]) => void;
  };
  setPhase: (phase: 'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review') => void;
  setActiveTab: (tab: 'capture' | 'gallery') => void;
  onSave: (signal: any) => void;
  onClose: () => void;
}

export function usePhotoBoothSaveHandler({
  lang, signalName, setSignalName, editingSignalId, setEditingSignalId,
  beatsCount, setBeatsCount, rawBase64ImagesRef, reprocess, setPhase, setActiveTab, onSave, onClose,
}: UsePhotoBoothSaveHandlerArgs) {
  const handlePickFromGallery = (sig: CloudRhythmSignal) => {
    setEditingSignalId(sig.id);
    setSignalName(sig.name);
    setBeatsCount(sig.beatsCount || (sig.frames?.length ?? 1));
    rawBase64ImagesRef.current = sig.rawFrames?.length ? sig.rawFrames : (sig.frames || [sig.image]);
    if (sig.cordelOptions) reprocess.handleUpdateCordelOptions(sig.cordelOptions);
    reprocess.setProcessedFrames(sig.frames?.length ? sig.frames : [sig.image]);
    setPhase('review');
    setActiveTab('capture');
  };

  const handleSaveSignal = async () => {
    if (reprocess.processedFrames.length === 0) return;
    const payload = {
      name: signalName.trim() || (lang === 'fr' ? 'Signal' : 'Sinal'),
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
      try {
        const { updateMestreSignal } = await import('../../../services/cloud-signals/mestreSignalsMutations');
        await updateMestreSignal(editingSignalId, payload);
      } catch {}
    }
    onSave(payload);
    onClose();
  };

  return { handlePickFromGallery, handleSaveSignal };
}
