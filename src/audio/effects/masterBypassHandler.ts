import { masterCompressorNode } from './effectsChainNodes';

/**
 * Compresseur Master : JAMAIS de `rampTo()` sur `threshold` / `ratio`. Tone.js traite un Param
 * en decibels par rampe exponentielle et substitue 1e-7 a 0, hors de la plage native [-100, 0].
 * On utilise `cancelScheduledValues` + `setTargetAtTime` (tau 15 ms) avec bornage strict.
 */
const TIME_CONSTANT = 0.015;
let lastCompSettings = { threshold: -6, ratio: 2 };
let isCurrentlyBypassed = false;
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
  if (!masterCompressorNode) return;
  const threshold = isCurrentlyBypassed ? 0 : clampThreshold(lastCompSettings.threshold);
  const ratio = isCurrentlyBypassed ? 1 : clampRatio(lastCompSettings.ratio);
  if (force || threshold !== lastAppliedThreshold) {
    setParamSmooth(masterCompressorNode.threshold, threshold, 'threshold');
    lastAppliedThreshold = threshold;
  }
  if (force || ratio !== lastAppliedRatio) {
    setParamSmooth(masterCompressorNode.ratio, ratio, 'ratio');
    lastAppliedRatio = ratio;
  }
}

/** Point d'entree unique du bypass (piloté par useMasterEffectsSync). Idempotent. */
export function syncMasterCompressorBypass(
  isBypassed: boolean,
  currentComp?: { threshold: number; ratio: number }
) {
  if (currentComp && Number.isFinite(currentComp.threshold) && Number.isFinite(currentComp.ratio)) {
    lastCompSettings = { threshold: currentComp.threshold, ratio: currentComp.ratio };
  }
  isCurrentlyBypassed = isBypassed;
  applyTargets();
}

/** Glisser des potards Threshold / Ratio : memorise le reglage, applique seulement hors bypass. */
export function previewMasterCompressorSetting(key: 'threshold' | 'ratio', value: number): void {
  lastCompSettings = { ...lastCompSettings, [key]: value };
  if (!isCurrentlyBypassed) applyTargets();
}

/** A appeler apres (re)creation du noeud natif : invalide le cache et reapplique les cibles. */
export function resetMasterCompressorCache(): void {
  lastAppliedThreshold = null;
  lastAppliedRatio = null;
  applyTargets(true);
}
