import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { PhotoBoothReviewTimeline } from './PhotoBoothReviewTimeline';
import { PhotoBoothControlsSidebar } from './PhotoBoothControlsSidebar';

interface PhotoBoothReviewSectionProps {
  frames: string[];
  selectedFrameIndex: number;
  bpm: number;
  lang: 'fr' | 'pt';
  overrideMode: 'global' | 'local';
  frameOverrides: Record<number, any>;
  activeInspectorOptions: any;
  isReprocessing: boolean;
  signalName: string;
  editingSignalId: string | null;
  onSelectFrame: (idx: number) => void;
  onBpmChange: (bpm: number) => void;
  setOverrideMode: (mode: 'global' | 'local') => void;
  onUpdateOption: (patch: any) => void;
  onResetLocalOverride: () => void;
  onSignalNameChange: (name: string) => void;
  onSaveSignal: () => void;
}

export const PhotoBoothReviewSection: React.FC<PhotoBoothReviewSectionProps> = ({
  frames,
  selectedFrameIndex,
  bpm,
  lang,
  overrideMode,
  frameOverrides,
  activeInspectorOptions,
  isReprocessing,
  signalName,
  editingSignalId,
  onSelectFrame,
  onBpmChange,
  setOverrideMode,
  onUpdateOption,
  onResetLocalOverride,
  onSignalNameChange,
  onSaveSignal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePlayheadIndex, setActivePlayheadIndex] = useState(0);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      setActivePlayheadIndex(0);
      return;
    }
    const intervalMs = (60 / bpm) * 1000;
    const timer = setInterval(() => {
      setActivePlayheadIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, bpm, frames.length]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <PhotoBoothReviewTimeline
        frames={frames}
        selectedFrameIndex={selectedFrameIndex}
        activePlayheadIndex={activePlayheadIndex}
        isPlaying={isPlaying}
        bpm={bpm}
        lang={lang}
        onSelectFrame={onSelectFrame}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onBpmChange={onBpmChange}
      />
      <div className="flex flex-col gap-2">
        <PhotoBoothControlsSidebar
          overrideMode={overrideMode}
          selectedFrameIndex={selectedFrameIndex}
          options={activeInspectorOptions}
          hasLocalOverride={Boolean(frameOverrides[selectedFrameIndex])}
          isReprocessing={isReprocessing}
          lang={lang}
          setOverrideMode={setOverrideMode}
          onUpdateOption={onUpdateOption}
          onResetLocalOverride={onResetLocalOverride}
        />
        <input
          type="text"
          value={signalName}
          onChange={(e) => onSignalNameChange(e.target.value)}
          placeholder={lang === 'fr' ? 'Nom du geste...' : 'Nome do gesto...'}
          className="bg-white border border-black px-2 py-1 text-xs font-bold"
        />
        <button
          type="button"
          onClick={onSaveSignal}
          className="py-2 bg-[#1b4332] text-white font-cactus font-bold text-sm border border-black shadow-[2px_2px_0px_#000] cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Save size={14} />
          <span>
            {editingSignalId
              ? lang === 'fr'
                ? 'Mettre à jour le signal'
                : 'Atualizar sinal'
              : lang === 'fr'
              ? 'Enregistrer le signal'
              : 'Salvar o sinal'}
          </span>
        </button>
      </div>
    </div>
  );
};
