import { MasterFX } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { convertLegacyReverbDbToPercent } from './acousticNormalizer';
import { DEFAULT_STUDIO_MASTER_BUS_CONFIG } from '../../audio/effects/studioFxPresets';
import { faderPositionToDb } from '../../utils/audioMath';

export function restoreMasterFxFromPreset(
  p: any,
  setMasterEQ: (eq: { low: number; mid: number; high: number }) => void,
  setMasterCompressor: (comp: { threshold: number; ratio: number }) => void,
  setMasterVol: (vol: number) => void,
  setMasterReverbVol: (vol: number) => void,
  setReverbDecay: (decay: number) => void
): void {
  const isValidNum = (v: any): v is number => typeof v === 'number' && !isNaN(v);

  setMasterEQ({
    low: isValidNum(p.masterEQ?.low) ? p.masterEQ.low : 0,
    mid: isValidNum(p.masterEQ?.mid) ? p.masterEQ.mid : 0,
    high: isValidNum(p.masterEQ?.high) ? p.masterEQ.high : 0,
  });

  setMasterCompressor({
    threshold: isValidNum(p.masterCompressor?.threshold) ? p.masterCompressor.threshold : -6,
    ratio: isValidNum(p.masterCompressor?.ratio) ? p.masterCompressor.ratio : 2,
  });

  const safeMasterVol = isValidNum(p.masterVol)
    ? (p.masterVol <= 12 ? p.masterVol : faderPositionToDb(p.masterVol))
    : 0;
  setMasterVol(safeMasterVol);

  const rawMasterFX = p.masterFX;

  let fallbackReverbTime = 25;
  if (isValidNum(p.reverbDecay)) {
    fallbackReverbTime = Math.max(0, Math.min(100, Math.round(((p.reverbDecay - 0.5) / 7.5) * 100)));
  } else if ((p as any).reverbType) {
    const oldType = (p as any).reverbType;
    if (oldType === 'hall') fallbackReverbTime = Math.round(((4.5 - 0.5) / 7.5) * 100);
    else if (oldType === 'studio') fallbackReverbTime = Math.round(((2.5 - 0.5) / 7.5) * 100);
    else fallbackReverbTime = Math.round(((1.5 - 0.5) / 7.5) * 100);
  }

  const loadedMasterFX: MasterFX = {
    reverb: {
      spaceType: 'wood_studio',
      preDelayMs: 12,
      lowCutHz: 140,
      dampHz: 7500,
      stereoWidth: 100,
      presetId: 'studio_bois',
      ...(rawMasterFX?.reverb || {}),
      returnVolume: isValidNum(rawMasterFX?.reverb?.returnVolume)
        ? convertLegacyReverbDbToPercent(rawMasterFX.reverb.returnVolume)
        : (isValidNum(p.masterReverbVol) ? convertLegacyReverbDbToPercent(p.masterReverbVol) : 20),
      time: isValidNum(rawMasterFX?.reverb?.time)
        ? rawMasterFX.reverb.time
        : fallbackReverbTime,
      isMuted: typeof rawMasterFX?.reverb?.isMuted === 'boolean' ? rawMasterFX.reverb.isMuted : false,
    },
    distortion: {
      character: 'soft_tube',
      preHpfHz: 180,
      toneHz: 6500,
      presetId: 'warm_triode',
      ...(rawMasterFX?.distortion || {}),
      returnVolume: isValidNum(rawMasterFX?.distortion?.returnVolume)
        ? rawMasterFX.distortion.returnVolume
        : (isValidNum(p.masterDistortion) ? p.masterDistortion : 0),
      drive: isValidNum(rawMasterFX?.distortion?.drive)
        ? rawMasterFX.distortion.drive
        : (isValidNum(p.masterDistortionDrive) ? p.masterDistortionDrive : 20),
      isMuted: typeof rawMasterFX?.distortion?.isMuted === 'boolean' ? rawMasterFX.distortion.isMuted : false,
    },
    masterBus: {
      ...DEFAULT_STUDIO_MASTER_BUS_CONFIG,
      ...(rawMasterFX?.masterBus || {}),
    },
  };

  useSequencerStore.getState().setMasterFX(loadedMasterFX);
  useSequencerStore.getState().setMasterEffectsActive({
    compressor: typeof p.masterEffectsActive?.compressor === 'boolean' ? p.masterEffectsActive.compressor : true,
    reverb: typeof p.masterEffectsActive?.reverb === 'boolean' ? p.masterEffectsActive.reverb : true,
    disto: typeof p.masterEffectsActive?.disto === 'boolean' ? p.masterEffectsActive.disto : true,
  });
  setMasterReverbVol(loadedMasterFX.reverb.returnVolume);
  setReverbDecay(0.5 + 7.5 * (loadedMasterFX.reverb.time / 100));
}
