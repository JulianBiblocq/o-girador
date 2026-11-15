import React, { useState, useEffect } from 'react';
import { Save, Camera } from 'lucide-react';
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
  onBackToNewCapture?: () => void;
}

export const PhotoBoothReviewSection: React.FC<PhotoBoothReviewSectionProps> = ({
  frames, selectedFrameIndex, bpm, lang, overrideMode, frameOverrides, activeInspectorOptions,
  isReprocessing, signalName, editingSignalId, onSelectFrame, onBpmChange, setOverrideMode,
  onUpdateOption, onResetLocalOverride, onSignalNameChange, onSaveSignal, onBackToNewCapture,
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[var(--cordel-text)]">
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
          className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] px-2.5 py-1.5 text-xs font-bold"
        />
        <div className="flex items-center gap-2">
          {onBackToNewCapture && (
            <button
              type="button"
              onClick={onBackToNewCapture}
              className="px-3 py-2 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] font-cactus font-bold text-xs uppercase border-2 border-[var(--cordel-border-strong)] cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Camera size={13} />
              <span>{lang === 'fr' ? 'Reprendre' : 'Recapturar'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSaveSignal}
            className="flex-1 py-2 bg-[var(--cordel-status-success)] hover:opacity-90 text-[var(--cordel-on-accent)] font-cactus font-bold text-sm border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer flex items-center justify-center gap-1.5 transition-opacity"
          >
            <Save size={14} />
            <span>
              {editingSignalId
                ? (lang === 'fr' ? 'Mettre à jour le signal' : 'Atualizar sinal')
                : (lang === 'fr' ? 'Enregistrer le signal' : 'Salvar o sinal')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
