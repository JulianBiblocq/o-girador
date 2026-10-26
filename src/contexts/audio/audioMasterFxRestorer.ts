import { MasterFX } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function restoreMasterFxFromPreset(
  p: any,
  setMasterEQ: (eq: { low: number; mid: number; high: number }) => void,
  setMasterCompressor: (comp: { threshold: number; ratio: number }) => void,
  setMasterVol: (vol: number) => void,
  setMasterReverbVol: (vol: number) => void,
  setReverbDecay: (decay: number) => void
): void {
  if (p.masterEQ) setMasterEQ(p.masterEQ);
  else setMasterEQ({ low: 0, mid: 0, high: 0 });

  if (p.masterCompressor) setMasterCompressor(p.masterCompressor);
  else setMasterCompressor({ threshold: -20, ratio: 4 });

  const safeMasterVol = (typeof p.masterVol === 'number' && !isNaN(p.masterVol) && p.masterVol <= 12)
    ? p.masterVol
    : 0;
  setMasterVol(safeMasterVol);

  const isValidNum = (v: any): v is number => typeof v === 'number' && !isNaN(v);
  const rawMasterFX = p.masterFX;

  let fallbackReverbTime = 30;
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
      returnVolume: isValidNum(rawMasterFX?.reverb?.returnVolume)
        ? rawMasterFX.reverb.returnVolume
        : (isValidNum(p.masterReverbVol) ? p.masterReverbVol : 70),
      time: isValidNum(rawMasterFX?.reverb?.time)
        ? rawMasterFX.reverb.time
        : fallbackReverbTime,
      isMuted: typeof rawMasterFX?.reverb?.isMuted === 'boolean' ? rawMasterFX.reverb.isMuted : false,
    },
    distortion: {
      returnVolume: isValidNum(rawMasterFX?.distortion?.returnVolume)
        ? rawMasterFX.distortion.returnVolume
        : (isValidNum(p.masterDistortion) ? p.masterDistortion : 0),
      drive: isValidNum(rawMasterFX?.distortion?.drive)
        ? rawMasterFX.distortion.drive
        : (isValidNum(p.masterDistortionDrive) ? p.masterDistortionDrive : 20),
      isMuted: typeof rawMasterFX?.distortion?.isMuted === 'boolean' ? rawMasterFX.distortion.isMuted : false,
    },
  };

  useSequencerStore.getState().setMasterFX(loadedMasterFX);
  useSequencerStore.getState().setMasterEffectsActive({
    compressor: true,
    reverb: true,
    disto: true
  });
  setMasterReverbVol(loadedMasterFX.reverb.returnVolume);
  setReverbDecay(0.5 + 7.5 * (loadedMasterFX.reverb.time / 100));
}
