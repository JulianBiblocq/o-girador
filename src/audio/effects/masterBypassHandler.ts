import { masterCompressorNode } from './effectsChainNodes';

export function syncMasterCompressorBypass(
  isBypassed: boolean,
  currentComp?: { threshold: number; ratio: number }
) {
  if (!masterCompressorNode) return;
  const targetThreshold = isBypassed ? 0 : Math.max(-100, Math.min(0, currentComp?.threshold ?? -3));
  const targetRatio = isBypassed ? 1 : Math.max(1, Math.min(2, currentComp?.ratio ?? 2));

  try {
    const thresh = masterCompressorNode.threshold as any;
    if (thresh) {
      if (typeof thresh.cancelScheduledValues === 'function') {
        thresh.cancelScheduledValues(0);
      }
      thresh._initialValue = targetThreshold;
      if (typeof thresh.setValueAtTime === 'function') {
        thresh.setValueAtTime(targetThreshold, 0);
      }
      thresh.value = targetThreshold;
    }
    if ((masterCompressorNode as any)._compressor?.threshold) {
      (masterCompressorNode as any)._compressor.threshold.value = targetThreshold;
    }
  } catch (_) {}

  try {
    const rat = masterCompressorNode.ratio as any;
    if (rat) {
      if (typeof rat.cancelScheduledValues === 'function') {
        rat.cancelScheduledValues(0);
      }
      rat._initialValue = targetRatio;
      if (typeof rat.setValueAtTime === 'function') {
        rat.setValueAtTime(targetRatio, 0);
      }
      rat.value = targetRatio;
    }
    if ((masterCompressorNode as any)._compressor?.ratio) {
      (masterCompressorNode as any)._compressor.ratio.value = targetRatio;
    }
  } catch (_) {}
}
