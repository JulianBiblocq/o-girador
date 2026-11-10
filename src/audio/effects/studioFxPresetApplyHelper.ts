import {
  DEFAULT_STUDIO_MASTER_BUS_CONFIG,
  STUDIO_COMPRESSOR_PRESETS,
  STUDIO_EQ_PRESETS,
  StudioMasterBusConfig,
} from './studioFxPresets';
import { StudioRackModuleKey, StudioUserPresetItem } from './studioFxUserPresets';
import { STUDIO_MASTER_AMBIANCES, StudioMasterAmbianceId } from './studioMasterAmbiances';
import { masterEQNode } from './effectsChainNodes';
import { safeRampGainDb, safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { MasterFX } from '../../types/store.types';

export interface StudioPresetApplyCallbacks {
  applyStudioFxPreset: (module: 'reverb' | 'saturation' | 'compressor', presetId: string) => void;
  updateReverb: (patch: Partial<MasterFX['reverb']>) => void;
  updateDisto: (patch: Partial<MasterFX['distortion']>) => void;
  updateBus: (patch: Partial<StudioMasterBusConfig>) => void;
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  onMasterEQChange?: (eq: { low: number; mid: number; high: number }) => void;
}

export function extractCurrentStudioTabSettings(
  tab: StudioRackModuleKey,
  masterFX: MasterFX,
  masterEQ: { low: number; mid: number; high: number },
  masterCompressor: { threshold: number; ratio: number }
): Record<string, any> {
  if (tab === 'reverb') return { ...masterFX.reverb, toadaSlapbackMode: masterFX.masterBus?.toadaSlapbackMode ?? 'off', toadaSlapbackWet: masterFX.masterBus?.toadaSlapbackWet ?? 0 };
  if (tab === 'saturation') return { ...masterFX.distortion, transientAttackDb: masterFX.masterBus?.transientAttackDb ?? 0, transientSustainDb: masterFX.masterBus?.transientSustainDb ?? 0 };
  if (tab === 'compressor') return { threshold: masterCompressor.threshold, ratio: masterCompressor.ratio, attackMs: masterFX.masterBus?.attackMs ?? 15, releaseMs: masterFX.masterBus?.releaseMs ?? 120, scHpfHz: masterFX.masterBus?.scHpfHz ?? 95, compMixPct: masterFX.masterBus?.compMixPct ?? 75, duckingDb: masterFX.masterBus?.duckingDb ?? 1.5 };
  return { low: masterEQ.low, mid: masterEQ.mid, high: masterEQ.high, eqMidFreqHz: masterFX.masterBus?.eqMidFreqHz ?? 1000, eqMidQMode: masterFX.masterBus?.eqMidQMode ?? 'wide', bassMonoEnabled: masterFX.masterBus?.bassMonoEnabled ?? true, bassMonoCrossoverHz: masterFX.masterBus?.bassMonoCrossoverHz ?? 110, ceilingDb: masterFX.masterBus?.ceilingDb ?? -0.3 };
}

function rampAndApplyEq(
  low: number, mid: number, high: number, midFreqHz?: number, midQMode?: 'wide' | 'narrow',
  onMasterEQChange?: (eq: { low: number; mid: number; high: number }) => void
) {
  if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, low, 0.02);
  if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, mid, 0.02);
  if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, high, 0.02);
  if (typeof midFreqHz === 'number' && masterEQNode?.midFreq) safeRampTo(masterEQNode.midFreq, midFreqHz, 0.02);
  if (midQMode && masterEQNode?.midQ) safeRampTo(masterEQNode.midQ, midQMode === 'narrow' ? 2.2 : 0.7, 0.02);
  onMasterEQChange?.({ low, mid, high });
}

export function applyStudioModulePresetSelection(
  tab: StudioRackModuleKey, presetId: string, userPreset: StudioUserPresetItem | undefined, cb: StudioPresetApplyCallbacks
): void {
  if (userPreset) {
    const st = userPreset.settings;
    if (tab === 'reverb') {
      const { toadaSlapbackMode, toadaSlapbackWet, ...revRest } = st;
      cb.updateReverb({ ...revRest, presetId });
      if (toadaSlapbackMode !== undefined || toadaSlapbackWet !== undefined) cb.updateBus({ toadaSlapbackMode, toadaSlapbackWet });
    } else if (tab === 'saturation') {
      const { transientAttackDb, transientSustainDb, ...distRest } = st;
      cb.updateDisto({ ...distRest, presetId });
      if (transientAttackDb !== undefined || transientSustainDb !== undefined) cb.updateBus({ transientAttackDb, transientSustainDb });
    } else if (tab === 'compressor') {
      const { threshold, ratio, ...compRest } = st;
      if (typeof threshold === 'number' && typeof ratio === 'number') cb.onMasterCompressorChange({ threshold, ratio });
      cb.updateBus({ ...compRest, compPresetId: presetId });
    } else {
      const { low = 0, mid = 0, high = 0, ...eqRest } = st;
      rampAndApplyEq(low, mid, high, eqRest.eqMidFreqHz, eqRest.eqMidQMode, cb.onMasterEQChange);
      cb.updateBus({ ...eqRest, eqPresetId: presetId });
    }
    return;
  }
  if (tab === 'reverb' || tab === 'saturation') { cb.applyStudioFxPreset(tab, presetId); return; }
  if (tab === 'compressor') {
    cb.applyStudioFxPreset('compressor', presetId);
    const found = STUDIO_COMPRESSOR_PRESETS.find(p => p.id === presetId);
    if (found) cb.onMasterCompressorChange({ threshold: found.settings.threshold, ratio: found.settings.ratio });
    return;
  }
  const eqP = STUDIO_EQ_PRESETS.find(p => p.id === presetId);
  if (eqP) {
    const { low, mid, high, ...busRest } = eqP.settings;
    rampAndApplyEq(low, mid, high, busRest.eqMidFreqHz, busRest.eqMidQMode, cb.onMasterEQChange);
    cb.updateBus({ ...busRest, eqPresetId: presetId });
  }
}

export function applyGlobalMasterAmbiance(ambianceId: StudioMasterAmbianceId, cb: StudioPresetApplyCallbacks): boolean {
  const amb = STUDIO_MASTER_AMBIANCES.find(a => a.id === ambianceId);
  if (!amb) return false;
  const ms = amb.masterSettings;
  if (ms.masterFX?.reverb) cb.updateReverb(ms.masterFX.reverb);
  if (ms.masterFX?.distortion) cb.updateDisto(ms.masterFX.distortion);
  if (ms.masterFX?.masterBus) cb.updateBus(ms.masterFX.masterBus);
  if (ms.masterCompressor) cb.onMasterCompressorChange({ threshold: ms.masterCompressor.threshold, ratio: ms.masterCompressor.ratio });
  if (ms.masterEQ) {
    const qMode = ms.masterEQ.midQ === 'narrow' ? 'narrow' : 'wide';
    rampAndApplyEq(ms.masterEQ.low, ms.masterEQ.mid, ms.masterEQ.high, ms.masterEQ.midFreqHz, qMode, cb.onMasterEQChange);
  }
  return true;
}

export function resetStudioRackTabToDefault(tab: StudioRackModuleKey, cb: StudioPresetApplyCallbacks): void {
  if (tab === 'reverb') {
    cb.updateReverb({ returnVolume: 70, time: 30, spaceType: 'wood_studio', preDelayMs: 12, lowCutHz: 140, dampHz: 7500, stereoWidth: 100, presetId: 'studio_bois' });
    cb.updateBus({ toadaSlapbackMode: 'off', toadaSlapbackWet: 0 });
  } else if (tab === 'saturation') {
    cb.updateDisto({ returnVolume: 0, drive: 20, character: 'soft_tube', preHpfHz: 180, toneHz: 6500, presetId: 'warm_triode' });
    cb.updateBus({ transientAttackDb: 0, transientSustainDb: 0 });
  } else if (tab === 'compressor') {
    cb.onMasterCompressorChange({ threshold: -6, ratio: 2 });
    cb.updateBus({ attackMs: 15, releaseMs: 120, scHpfHz: 95, compMixPct: 75, duckingDb: 1.5, compPresetId: 'natural_glue' });
  } else {
    rampAndApplyEq(0, 0, 0, DEFAULT_STUDIO_MASTER_BUS_CONFIG.eqMidFreqHz, 'wide', cb.onMasterEQChange);
    cb.updateBus({ eqMidFreqHz: DEFAULT_STUDIO_MASTER_BUS_CONFIG.eqMidFreqHz, eqMidQMode: 'wide', bassMonoEnabled: true, bassMonoCrossoverHz: 110, ceilingDb: -0.3, eqPresetId: 'flat_studio' });
  }
}
