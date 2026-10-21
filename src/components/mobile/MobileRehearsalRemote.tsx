import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MobileRehearsalHeader } from './MobileRehearsalHeader';
import { MobileSpeakerEqSelector } from './MobileSpeakerEqSelector';
import { MobileVisualBeatPulse } from './MobileVisualBeatPulse';
import { MobileFamilyMixer } from './MobileFamilyMixer';
import { MobileTransportHero } from './MobileTransportHero';
import { MobileFieldToolsSheet } from './MobileFieldToolsSheet';
import { PresetAccordionSelector } from '../PresetAccordionSelector';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { CloudRhythmSignal } from '../../types';
import { X } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: (opts?: any) => void;
  onStop: () => void;
  masterEQ: { low: number; mid: number; high: number };
  setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  cloudPresets: any[];
  localPresets: any[];
  onPresetChange: (val: string) => void;
  activePreset: string;
  onToggleStudio: () => void;
  onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
}

export const MobileRehearsalRemote: React.FC<Props> = ({
  isPlaying,
  isLoading,
  onTogglePlay,
  onStop,
  masterEQ,
  setMasterEQ,
  cloudPresets,
  localPresets,
  onPresetChange,
  activePreset,
  onToggleStudio,
  onOpenPaperWorkshop,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);
  const metadata = useSequencerStore((s) => s.metadata);
  const lang = useSequencerStore((s) => s.lang);

  const songTitle = metadata?.toada || activePreset;

  return (
    <div className="flex flex-col h-full w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden relative select-none">
      <MobileRehearsalHeader
        songTitle={songTitle}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
        onToggleStudio={onToggleStudio}
        onOpenSongPicker={() => setIsSongPickerOpen(true)}
      />

      <MobileSpeakerEqSelector
        currentEQ={masterEQ}
        onApplyEQ={setMasterEQ}
        disabled={isLocked}
      />

      <div className="px-3 pb-1">
        <MobileVisualBeatPulse />
      </div>

      <MobileFamilyMixer isLocked={isLocked} />

      <MobileFieldToolsSheet
        onOpenPaperWorkshop={onOpenPaperWorkshop}
        onOpenPhotoBooth={() => setIsPhotoBoothOpen(true)}
      />

      <MobileTransportHero
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlay={onTogglePlay}
        onStop={onStop}
      />

      {isPhotoBoothOpen && (
        <MusicalPhotoBoothModal
          isOpen={isPhotoBoothOpen}
          onClose={() => setIsPhotoBoothOpen(false)}
          onSave={(sig) => {
            const list = useSequencerStore.getState().mestreSignals || [];
            const newSig: CloudRhythmSignal = { ...sig, id: `sig_${Date.now()}`, mestreId: 'local' };
            useSequencerStore.setState({ mestreSignals: [...list, newSig] });
            setIsPhotoBoothOpen(false);
          }}
          lang={lang}
        />
      )}

      {isSongPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-[var(--cordel-bg)] cordel-border w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 border-b-2 border-[var(--cordel-border)] flex items-center justify-between bg-black/5">
              <span className="font-cactus font-bold text-sm uppercase">
                Choisir un morceau
              </span>
              <button
                onClick={() => setIsSongPickerOpen(false)}
                className="p-1 cordel-border-sm font-bold"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto flex-1">
              <PresetAccordionSelector
                lang={lang}
                activePreset={activePreset}
                currentSongTitle={songTitle}
                publicCloudPresets={cloudPresets.filter((p: any) => !p.isPrivate)}
                privateCloudPresets={cloudPresets.filter((p: any) => p.isPrivate)}
                localPresets={localPresets}
                isCloudPresetsLoading={false}
                showGroupCatalogue={true}
                groupLabel="Catalogue"
                onSelectPreset={(val) => {
                  onPresetChange(val);
                  setIsSongPickerOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
