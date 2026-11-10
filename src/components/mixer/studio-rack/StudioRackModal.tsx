import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { StudioRackModuleId } from '../masterEffectsTypes';
import { StudioUserPresetItem } from '../../../audio/effects/studioFxUserPresets';
import {
  extractCurrentStudioTabSettings,
  applyStudioModulePresetSelection,
  resetStudioRackTabToDefault,
} from '../../../audio/effects/studioFxPresetApplyHelper';
import { getStudioRackStrings } from './studioRackI18n';
import { StudioRackHeader } from './StudioRackHeader';
import { StudioRackReverbTab } from './StudioRackReverbTab';
import { StudioRackDistoTab } from './StudioRackDistoTab';
import { StudioRackCompTab } from './StudioRackCompTab';
import { StudioRackEqOutTab } from './StudioRackEqOutTab';

interface StudioRackModalProps {
  initialTab: StudioRackModuleId;
  lang: string;
  isPlaying: boolean;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  onClose: () => void;
}

export const StudioRackModal: React.FC<StudioRackModalProps> = ({
  initialTab, lang, isPlaying, masterEQ, onMasterEQChange, masterCompressor, onMasterCompressorChange, onClose,
}) => {
  const [activeTab, setActiveTab] = useState<StudioRackModuleId>(initialTab);
  const s = getStudioRackStrings(lang);

  const masterFX = useSequencerStore(st => st.masterFX);
  const disableFx = useSequencerStore(st => Boolean(st.ecoConfig?.disableFx));
  const disableEq = useSequencerStore(st => Boolean(st.ecoConfig?.disableEq));
  const applyStudioFxPreset = useSequencerStore(st => st.applyStudioFxPreset);
  const updateReverb = useSequencerStore(st => st.updateMasterReverbConfig);
  const updateDisto = useSequencerStore(st => st.updateMasterDistortionConfig);
  const updateBus = useSequencerStore(st => st.updateMasterBusConfig);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const activePresetId =
    activeTab === 'reverb' ? (masterFX.reverb.presetId ?? '')
    : activeTab === 'saturation' ? (masterFX.distortion.presetId ?? '')
    : activeTab === 'compressor' ? (masterFX.masterBus?.compPresetId ?? '')
    : (masterFX.masterBus?.eqPresetId ?? '');

  const callbacks = {
    applyStudioFxPreset, updateReverb, updateDisto, updateBus, onMasterCompressorChange, onMasterEQChange,
  };

  const getCurrentTabSettings = () => extractCurrentStudioTabSettings(activeTab, masterFX, masterEQ, masterCompressor);
  const handleSelectPreset = (presetId: string, userPreset?: StudioUserPresetItem) => {
    applyStudioModulePresetSelection(activeTab, presetId, userPreset, callbacks);
  };
  const handleResetActiveTab = () => resetStudioRackTabToDefault(activeTab, callbacks);

  const modalContent = (
    <div data-testid="studio-rack-modal-backdrop" onClick={onClose} className="fixed inset-0 z-[100020] bg-black/65 pt-14 pb-3 px-4 flex items-center justify-center overflow-y-auto">
      <div data-testid="studio-rack-modal" onClick={e => e.stopPropagation()} className="w-full max-w-[780px] bg-[var(--cordel-master-bg)] text-[var(--cordel-text)] border-[3px] border-[var(--cordel-border)] shadow-[6px_6px_0px_var(--cordel-ink-dark)] rounded-none flex flex-col overflow-hidden">
        <StudioRackHeader
          activeTab={activeTab} onSelectTab={setActiveTab} activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset} getCurrentTabSettings={getCurrentTabSettings}
          onResetActiveTab={handleResetActiveTab} onClose={onClose} lang={lang} s={s} disableFx={disableFx} disableEq={disableEq}
        />
        <div className="p-3.5 overflow-y-auto max-h-[calc(100vh-150px)]">
          {activeTab === 'reverb' && <StudioRackReverbTab s={s} />}
          {activeTab === 'saturation' && <StudioRackDistoTab s={s} />}
          {activeTab === 'compressor' && <StudioRackCompTab s={s} isPlaying={isPlaying} masterCompressor={masterCompressor} onMasterCompressorChange={onMasterCompressorChange} />}
          {activeTab === 'eq' && <StudioRackEqOutTab s={s} isPlaying={isPlaying} masterEQ={masterEQ} onMasterEQChange={onMasterEQChange} />}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
