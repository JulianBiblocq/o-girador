/**
 * Helpers de sérialisation/restauration d'automations, transposition vocale (`-12..+12`), vigilance
 * et réglages d'Acoustique d'Ensemble (`skinChorusAmount`, `rodaBreathingAmount`) (< 105 lignes).
 */

import { DEFAULT_STUDIO_MASTER_BUS_CONFIG } from '../../audio/effects/studioFxPresets';
import {
  DEFAULT_RODA_BREATHING_AMOUNT,
  DEFAULT_SKIN_CHORUS_AMOUNT,
  sanitizeEnsembleAmount,
  useSequencerStore,
} from '../../stores/useSequencerStore';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import type { MasterFX } from '../../types';

export function sanitizeVocalTransposeSteps(raw: unknown, fallback = 0): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.max(-12, Math.min(12, Math.round(num)));
  return Object.is(clamped, -0) ? 0 : clamped;
}

export function resolvePresetVocalTransposeSteps(p: any): number {
  const raw =
    p?.vocalTransposeSteps ??
    p?.transpositionSemitones ??
    p?.metadata?.vocalTransposeSteps ??
    p?.metadata?.transpositionSemitones;
  return sanitizeVocalTransposeSteps(raw, 0);
}

export function buildSerializedMasterFX(masterFX?: Partial<MasterFX> | null): MasterFX {
  return {
    reverb: {
      returnVolume: masterFX?.reverb?.returnVolume ?? 70,
      time: masterFX?.reverb?.time ?? 30,
      isMuted: Boolean(masterFX?.reverb?.isMuted),
      spaceType: masterFX?.reverb?.spaceType ?? 'wood_studio',
      preDelayMs: masterFX?.reverb?.preDelayMs ?? 12,
      lowCutHz: masterFX?.reverb?.lowCutHz ?? 140,
      dampHz: masterFX?.reverb?.dampHz ?? 7500,
      stereoWidth: masterFX?.reverb?.stereoWidth ?? 100,
      presetId: masterFX?.reverb?.presetId ?? 'studio_bois',
    },
    distortion: {
      returnVolume: masterFX?.distortion?.returnVolume ?? 0,
      drive: masterFX?.distortion?.drive ?? 20,
      isMuted: Boolean(masterFX?.distortion?.isMuted),
      character: masterFX?.distortion?.character ?? 'soft_tube',
      preHpfHz: masterFX?.distortion?.preHpfHz ?? 180,
      toneHz: masterFX?.distortion?.toneHz ?? 6500,
      presetId: masterFX?.distortion?.presetId ?? 'warm_triode',
    },
    masterBus: {
      ...DEFAULT_STUDIO_MASTER_BUS_CONFIG,
      ...(masterFX?.masterBus || {}),
    },
  };
}

export function restorePresetAutomationsAndVocal(p: any): void {
  const store = useSequencerStore.getState();

  const targetTranspose = resolvePresetVocalTransposeSteps(p);
  const meta = store.metadata;
  useSequencerStore.setState({
    vocalTransposeSteps: targetTranspose,
    metadata: meta
      ? { ...meta, vocalTransposeSteps: targetTranspose, transpositionSemitones: targetTranspose }
      : meta,
  });

  const isMasterBypassed = Boolean(p.isMasterVolumeBypassed);
  const globalBypass = p.globalAutomationBypass || { all: false, volume: false, pan: false, reverb: false };
  const chorus = sanitizeEnsembleAmount(p.skinChorusAmount ?? p.metadata?.skinChorusAmount, DEFAULT_SKIN_CHORUS_AMOUNT);
  const breathing = sanitizeEnsembleAmount(p.rodaBreathingAmount ?? p.metadata?.rodaBreathingAmount, DEFAULT_RODA_BREATHING_AMOUNT);

  store.setSkinChorusAmount(chorus);
  store.setRodaBreathingAmount(breathing);
  useSequencerStore.setState({
    isMasterVolumeBypassed: isMasterBypassed,
    globalAutomationBypass: globalBypass,
    isEnsembleAcousticsBypassed: false,
  });
}

export function restorePresetVigilancePoints(p: any): void {
  const rawVigilance = p.vigilancePoints || p.metadata?.vigilancePoints;
  if (Array.isArray(rawVigilance) && rawVigilance.length > 0) {
    const resolvedScoreId = p.id || p.metadata?.toada || 'preset';
    const normalizedPoints = rawVigilance.map((pt: any) => ({
      ...pt,
      scoreId: pt.scoreId || resolvedScoreId,
      id: pt.id && String(pt.id).includes('__') && pt.scoreId ? pt.id : `${resolvedScoreId}__${pt.sectionName}__${pt.roleKey}__${pt.stepIndex}`,
    }));
    usePaperVigilanceStore.setState({ points: normalizedPoints, activeFocusPoint: null, activeSequencerScoreId: resolvedScoreId });
  } else {
    usePaperVigilanceStore.getState().setActiveSequencerScoreId(null);
  }
}
