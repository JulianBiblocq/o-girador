/**
 * masterBypassHandler.ts
 * Pilotage sans clic du Compresseur Bus Glue & de la chaîne `MasterBusWorkletManager` (< 90 lignes).
 */
import { masterBusWorkletManager, masterCompressorNode } from './effectsChainNodes';
import type { MasterBusDspParams } from '../worklet/master-bus/masterBusWorkletTypes';

const TIME_CONSTANT = 0.015;
let lastCompSettings = { threshold: -6, ratio: 2 };
let isCurrentlyBypassed = false;
let isEcoBypassAesthetic = false;
let lastAppliedThreshold: number | null = null;
let lastAppliedRatio: number | null = null;

const clampThreshold = (v: number) => Math.max(-100, Math.min(0, Number.isFinite(v) ? v : -6));
const clampRatio = (v: number) => Math.max(1, Math.min(20, Number.isFinite(v) ? v : 2));

function setParamSmooth(param: any, value: number, label: string): void {
  if (!param) return;
  try {
    const now = param.context?.currentTime ?? 0;
    if (typeof param.setTargetAtTime === 'function') {
      param.cancelScheduledValues?.(now);
      param.setTargetAtTime(value, now, TIME_CONSTANT);
    } else {
      param.value = value;
    }
  } catch (err) {
    console.error(`[MasterCompressor] ${label} update failed:`, err);
  }
}

function applyTargets(force = false): void {
  const threshold = clampThreshold(lastCompSettings.threshold);
  const ratio = clampRatio(lastCompSettings.ratio);

  if (masterBusWorkletManager) {
    masterBusWorkletManager.updateParams({
      compressorEnabled: !isCurrentlyBypassed,
      ecoBypassAesthetic: isEcoBypassAesthetic,
      thresholdDb: Math.max(-40, threshold),
      ratio: Math.min(10, ratio),
    });
  }

  if (!masterCompressorNode) return;
  const effThreshold = isCurrentlyBypassed ? 0 : threshold;
  const effRatio = isCurrentlyBypassed ? 1 : ratio;
  if (force || effThreshold !== lastAppliedThreshold) {
    setParamSmooth(masterCompressorNode.threshold, effThreshold, 'threshold');
    lastAppliedThreshold = effThreshold;
  }
  if (force || effRatio !== lastAppliedRatio) {
    setParamSmooth(masterCompressorNode.ratio, effRatio, 'ratio');
    lastAppliedRatio = effRatio;
  }
}

export function syncMasterCompressorBypass(
  isBypassed: boolean,
  currentComp?: { threshold: number; ratio: number },
  ecoBypassAesthetic = false
): void {
  if (currentComp && Number.isFinite(currentComp.threshold) && Number.isFinite(currentComp.ratio)) {
    lastCompSettings = { threshold: currentComp.threshold, ratio: currentComp.ratio };
  }
  isCurrentlyBypassed = isBypassed;
  isEcoBypassAesthetic = ecoBypassAesthetic;
  applyTargets();
}

export function syncMasterBusWorkletParams(patch: Partial<MasterBusDspParams>): void {
  if (!masterBusWorkletManager) return;
  masterBusWorkletManager.updateParams(patch);
}

export function previewMasterCompressorSetting(key: 'threshold' | 'ratio', value: number): void {
  lastCompSettings = { ...lastCompSettings, [key]: value };
  if (!isCurrentlyBypassed) applyTargets();
}

export function resetMasterCompressorCache(): void {
  lastAppliedThreshold = null;
  lastAppliedRatio = null;
  applyTargets(true);
}
