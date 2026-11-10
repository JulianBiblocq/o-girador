import React, { useEffect, useState } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { StudioRackModuleId } from '../masterEffectsTypes';
import {
  DEFAULT_STUDIO_MASTER_BUS_CONFIG, STUDIO_COMPRESSOR_PRESETS, STUDIO_EQ_PRESETS,
} from '../../../audio/effects/studioFxPresets';
import { masterEQNode } from '../../../hooks/useAudioSync';
import { safeRampGainDb, safeRampTo } from '../../../utils/audio/safeAudioParamRamp';
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
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const activePresetId =
    activeTab === 'reverb' ? (masterFX.reverb.presetId ?? '')
    : activeTab === 'saturation' ? (masterFX.distortion.presetId ?? '')
    : activeTab === 'compressor' ? (masterFX.masterBus?.compPresetId ?? '')
    : (masterFX.masterBus?.eqPresetId ?? '');

  const handleSelectPreset = (presetId: string) => {
    if (activeTab === 'reverb' || activeTab === 'saturation') {
      applyStudioFxPreset(activeTab, presetId);
      return;
    }
    if (activeTab === 'compressor') {
      applyStudioFxPreset('compressor', presetId);
      const found = STUDIO_COMPRESSOR_PRESETS.find(p => p.id === presetId);
      if (found) onMasterCompressorChange({ threshold: found.settings.threshold, ratio: found.settings.ratio });
      return;
    }
    const eqP = STUDIO_EQ_PRESETS.find(p => p.id === presetId);
    if (eqP) {
      const { low, mid, high, ...busRest } = eqP.settings;
      if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, low, 0.02);
      if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, mid, 0.02);
      if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, high, 0.02);
      onMasterEQChange({ low, mid, high });
      updateBus({ ...busRest, eqPresetId: presetId });
    }
  };

  const handleResetActiveTab = () => {
    if (activeTab === 'reverb') {
      updateReverb({ returnVolume: 70, time: 30, spaceType: 'wood_studio', preDelayMs: 12, lowCutHz: 140, dampHz: 7500, stereoWidth: 100, presetId: 'studio_bois' });
      updateBus({ toadaSlapbackMode: 'off', toadaSlapbackWet: 0 });
    } else if (activeTab === 'saturation') {
      updateDisto({ returnVolume: 0, drive: 20, character: 'soft_tube', preHpfHz: 180, toneHz: 6500, presetId: 'warm_triode' });
      updateBus({ transientAttackDb: 0, transientSustainDb: 0 });
    } else if (activeTab === 'compressor') {
      onMasterCompressorChange({ threshold: -6, ratio: 2 });
      updateBus({ attackMs: 15, releaseMs: 120, scHpfHz: 95, compMixPct: 75, duckingDb: 1.5, compPresetId: 'natural_glue' });
    } else {
      if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, 0, 0.02);
      if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, 0, 0.02);
      if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, 0, 0.02);
      if (masterEQNode?.midFreq) safeRampTo(masterEQNode.midFreq, 1000, 0.02);
      if (masterEQNode?.midQ) safeRampTo(masterEQNode.midQ, 0.7, 0.02);
      onMasterEQChange({ low: 0, mid: 0, high: 0 });
      updateBus({ eqMidFreqHz: DEFAULT_STUDIO_MASTER_BUS_CONFIG.eqMidFreqHz, eqMidQMode: 'wide', bassMonoEnabled: true, bassMonoCrossoverHz: 110, ceilingDb: -0.3, eqPresetId: 'flat_studio' });
    }
  };

  return (
    <div data-testid="studio-rack-modal-backdrop" onClick={onClose} className="fixed inset-0 z-50 bg-black/65 pt-14 pb-3 px-4 flex items-center justify-center overflow-y-auto">
      <div data-testid="studio-rack-modal" onClick={e => e.stopPropagation()} className="w-full max-w-[760px] bg-[var(--cordel-master-bg)] text-[var(--cordel-text)] border-[3px] border-[var(--cordel-border)] shadow-[6px_6px_0px_var(--cordel-ink-dark)] rounded-none flex flex-col overflow-hidden">
        <StudioRackHeader
          activeTab={activeTab} onSelectTab={setActiveTab} activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset} onResetActiveTab={handleResetActiveTab}
          onClose={onClose} lang={lang} s={s} disableFx={disableFx} disableEq={disableEq}
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
};
