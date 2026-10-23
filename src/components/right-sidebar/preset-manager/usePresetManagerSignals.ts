
import { useState, useRef, ChangeEvent } from 'react';
import { PresetMetadata, RhythmSignal, Language } from '../../../types';
import type { CordelOptions } from '../../../utils/cordelEffect';
import { processSignalImageFile } from '../../../utils/signalImageProcessor';

interface UsePresetManagerSignalsParams {
  metadata: PresetMetadata;
  onMetadataChange: (newMeta: PresetMetadata) => void;
  lang: Language;
}

export function usePresetManagerSignals({
  metadata,
  onMetadataChange,
  lang,
}: UsePresetManagerSignalsParams) {
  const [showAddSignalForm, setShowAddSignalForm] = useState(false);
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const [localSignalToEdit, setLocalSignalToEdit] = useState<RhythmSignal | null>(null);
  const retakeTargetLocalIdRef = useRef<string | null>(null);
  const [pendingSignalImage, setPendingSignalImage] = useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = useState('');
  const [rawSignalFrames, setRawSignalFrames] = useState<string[]>([]);

  const handleSignalFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { base64, defaultName } = await processSignalImageFile(file);
        if (!pendingSignalName) setPendingSignalName(defaultName);
        setRawSignalFrames([base64]);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  const handlePhotoBoothSave = (signalData: {
    name: string;
    image: string;
    frames: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount: number;
    mirrorHorizontal?: boolean;
  }) => {
    if (retakeTargetLocalIdRef.current) {
      const targetId = retakeTargetLocalIdRef.current;
      retakeTargetLocalIdRef.current = null;
      const prev = metadata.rhythmSignals || [];
      const updated = prev.map((s) => (s.id === targetId ? { ...s, ...signalData } : s));
      onMetadataChange({ ...metadata, rhythmSignals: updated });
      setIsPhotoBoothOpen(false);
      return;
    }

    const newSignal: RhythmSignal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...signalData,
      createdAt: Date.now(),
    };
    const prev = metadata.rhythmSignals || [];
    onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
    setIsPhotoBoothOpen(false);
  };

  const handleSaveEditSignal = (updatedSignal: any) => {
    const prev = metadata.rhythmSignals || [];
    const updated = prev.map((s) => (s.id === updatedSignal.id ? { ...s, ...updatedSignal } : s));
    onMetadataChange({ ...metadata, rhythmSignals: updated });
    setLocalSignalToEdit(null);
  };

  const handleAddLocalSignal = () => {
    if (!pendingSignalImage) return;
    const finalName = pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome');
    const newSignal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: finalName,
      image: pendingSignalImage,
    };
    const prev = metadata.rhythmSignals || [];
    onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
    setPendingSignalImage(null);
    setPendingSignalName('');
    setShowAddSignalForm(false);
  };

  return {
    showAddSignalForm,
    setShowAddSignalForm,
    isPhotoBoothOpen,
    setIsPhotoBoothOpen,
    localSignalToEdit,
    setLocalSignalToEdit,
    retakeTargetLocalIdRef,
    pendingSignalImage,
    setPendingSignalImage,
    pendingSignalName,
    setPendingSignalName,
    rawSignalFrames,
    setRawSignalFrames,
    handleSignalFileChange,
    handlePhotoBoothSave,
    handleSaveEditSignal,
    handleAddLocalSignal,
  };
}
