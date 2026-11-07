import { masterCompressorNode } from './effectsChainNodes';

export function syncMasterCompressorBypass(
  isBypassed: boolean,
  currentComp?: { threshold: number; ratio: number }
) {
  if (!masterCompressorNode) return;
  const targetThreshold = isBypassed ? 0 : Math.max(-100, Math.min(0, currentComp?.threshold ?? -6));
  const targetRatio = isBypassed ? 1 : Math.max(1, Math.min(12, currentComp?.ratio ?? 2));

  try {
    const thresh = masterCompressorNode.threshold as any;
    if (thresh) {
      if (typeof thresh.rampTo === 'function') {
        thresh.rampTo(targetThreshold, 0.02);
      } else {
        thresh.value = targetThreshold;
      }
    }
    if ((masterCompressorNode as any)._compressor?.threshold) {
      (masterCompressorNode as any)._compressor.threshold.value = targetThreshold;
    }
  } catch (_) {}

  try {
    const rat = masterCompressorNode.ratio as any;
    if (rat) {
      if (typeof rat.rampTo === 'function') {
        rat.rampTo(targetRatio, 0.02);
      } else {
        rat.value = targetRatio;
      }
    }
    if ((masterCompressorNode as any)._compressor?.ratio) {
      (masterCompressorNode as any)._compressor.ratio.value = targetRatio;
    }
  } catch (_) {}
}
