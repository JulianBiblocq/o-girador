/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern, Track, GlobalSwing } from '../types';
import { useBalancoStore } from '../stores/useBalancoStore';

export interface StepBalancoParams {
  stepIdx: number;
  steps: number;
  beatResolutions?: number[];
  track?: Pick<Track, 'balancoPresetId' | 'balancoAmount' | 'swingIntensity'> | null;
  pattern?: Pick<Pattern, 'balancoPresetId' | 'balancoAmount' | 'swingIntensity'> | null;
  globalSwing?: GlobalSwing | null;
}

/**
 * Calcule le pourcentage de décalage de balanço pour un pas précis,
 * en respectant la hiérarchie : Pattern > Track > Global Swing.
 */
export function computeStepBalancoPercent({
  stepIdx,
  steps,
  beatResolutions,
  track,
  pattern,
  globalSwing
}: StepBalancoParams): number {
  if (globalSwing?.mode === 'off') return 0;

  // 1. Détermination de la position dans le groupe de 4 doubles-croches
  let posInGroup = 0;
  if (beatResolutions && beatResolutions.length > 0) {
    let accumulated = 0;
    for (const res of beatResolutions) {
      if (stepIdx >= accumulated && stepIdx < accumulated + res) {
        if (res === 3 || res === 6) return 0; // Pas de balanço sur les triolets / sextuplets
        posInGroup = stepIdx - accumulated;
        break;
      }
      accumulated += res;
    }
  } else {
    const posInBeat = ((stepIdx / (steps / 4)) % 1) * 4;
    posInGroup = Math.round(posInBeat) % 4;
  }

  // 2. Multiplicateurs de dosage d'intensité (Track * Pattern * Global)
  const trackAmount = track?.balancoAmount !== undefined
    ? track.balancoAmount
    : (track?.swingIntensity !== undefined ? track.swingIntensity : 100);
  const patternAmount = pattern?.balancoAmount !== undefined
    ? pattern.balancoAmount
    : (pattern?.swingIntensity !== undefined ? pattern.swingIntensity : 100);
  const totalMultiplier = (trackAmount / 100) * (patternAmount / 100);

  const globalIntensity = (globalSwing?.swingIntensity !== undefined ? globalSwing.swingIntensity : 100) / 100;
  const effectiveIntensity = globalIntensity * totalMultiplier;

  // 3. Résolution du preset : Pattern > Track > Global
  const patternPresetId = pattern?.balancoPresetId;
  const trackPresetId = track?.balancoPresetId;

  // Si le mode global est personnalisé sans surcharge de preset sur la piste ou le motif
  if (globalSwing?.mode === 'custom' && !patternPresetId && !trackPresetId) {
    const customOffsets = globalSwing.customOffsets || [0, 8, -29, -58];
    const offsetPct = customOffsets[posInGroup % customOffsets.length] || 0;
    return offsetPct * effectiveIntensity;
  }

  // Résolution via useBalancoStore
  const effectivePresetId = patternPresetId || trackPresetId || (globalSwing?.mode === 'maracatu' ? 'maracatu-trad' : undefined);
  const resolvedPreset = useBalancoStore.getState().resolvePreset(effectivePresetId);
  const offsets = resolvedPreset?.offsets || [0, 8, -29, -58];
  const offsetPct = offsets[posInGroup % offsets.length] || 0;

  return offsetPct * effectiveIntensity;
}

export interface BalancoOffsetParams extends StepBalancoParams {
  bpm: number;
  isPreRoll?: boolean;
}

/**
 * Calcule le décalage temporel en secondes (deltaT) induit par le Balanço
 * pour un pas donné, directement convertible pour Tone.js / Web Audio.
 * 
 * Sécurités :
 * - Ancrage strict à 0 sur le premier temps de mesure (stepIdx === 0 hors anacrouse).
 * - Calibrage identique au moteur des percussions (100% = demi-durée de pas).
 */
export function getBalancoOffsetSec({
  stepIdx,
  steps,
  beatResolutions,
  track,
  pattern,
  globalSwing,
  bpm,
  isPreRoll = false,
}: BalancoOffsetParams): number {
  if (!isPreRoll && stepIdx === 0) return 0;
  if (!bpm || bpm <= 0) return 0;

  const percent = computeStepBalancoPercent({
    stepIdx,
    steps,
    beatResolutions,
    track,
    pattern,
    globalSwing,
  });

  if (percent === 0) return 0;

  const numBeats = 4; // Référence quaternaire par défaut
  const stepDurationSec = (60 / bpm) / (steps / numBeats);
  return (percent / 100) * stepDurationSec * 0.5;
}
