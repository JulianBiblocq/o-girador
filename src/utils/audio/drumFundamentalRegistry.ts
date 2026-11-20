/**
 * drumFundamentalRegistry.ts — Registre Acoustique SSOT des Fondamentales (f0) Studio & Legacy (< 110 lignes)
 * - Alfaias Studio verrouillées sur mesures FFT/NSDF 60..380 ms (71.21 / 81.11 / 96.33 Hz) + Gonguê (414.5 Hz).
 * - Bascule automatique vers `studioHz` dès que `STUDIO_BANK_ENABLED[id]` passe à `true` (Caixa, Tarol, Timbal).
 */

import {
  PendingStudioInstrumentId,
  STUDIO_BANK_ENABLED,
} from '../../universes/maracatu/instruments/studioBankRegistry';
import { DEFAULT_REFERENCE_PITCH_HZ, sanitizePitchHz } from '../pitchHzContract';

export interface DrumFundamentalSpec {
  studioHz: number;
  legacyHz: number;
  studioSecondaryHz?: number;
  secondaryHz?: number;
  alwaysStudioCalibrated?: boolean;
  presetRangeSt: readonly [number, number];
}

export const DRUM_FUNDAMENTAL_SPECS: Record<string, DrumFundamentalSpec> = {
  marcante: {
    studioHz: 71.21,
    legacyHz: 71.21,
    alwaysStudioCalibrated: true,
    presetRangeSt: [-5.0, 5.0],
  },
  meiao: {
    studioHz: 81.11,
    legacyHz: 81.11,
    alwaysStudioCalibrated: true,
    presetRangeSt: [-5.0, 5.0],
  },
  repique: {
    studioHz: 96.33,
    legacyHz: 96.33,
    alwaysStudioCalibrated: true,
    presetRangeSt: [-5.0, 5.0],
  },
  caixa: {
    studioHz: 165.41,
    legacyHz: 166.87,
    secondaryHz: 267.55,
    presetRangeSt: [-2.0, 2.0],
  },
  tarol: {
    studioHz: 203.03,
    legacyHz: 203.03,
    presetRangeSt: [-2.0, 2.0],
  },
  timbal: {
    studioHz: 198.27,
    legacyHz: 206.91,
    studioSecondaryHz: 60.8,
    secondaryHz: 95.39,
    presetRangeSt: [-5.0, 5.0],
  },
  gongue: {
    studioHz: 411.97,
    legacyHz: 414.5,
    presetRangeSt: [-5.0, 5.0],
  },
};

export function isDrumStudioBankActive(
  instrumentId: string,
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): boolean {
  const spec = DRUM_FUNDAMENTAL_SPECS[instrumentId];
  if (!spec) return false;
  if (spec.alwaysStudioCalibrated) return true;
  const key = instrumentId as PendingStudioInstrumentId;
  if (studioFlagsOverride && key in studioFlagsOverride) {
    return Boolean(studioFlagsOverride[key]);
  }
  return Boolean(STUDIO_BANK_ENABLED[key]);
}

export function getDrumNaturalBaseHz(
  instrumentId: string,
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): number {
  const spec = DRUM_FUNDAMENTAL_SPECS[instrumentId] || DRUM_FUNDAMENTAL_SPECS.meiao;
  return isDrumStudioBankActive(instrumentId, studioFlagsOverride) ? spec.studioHz : spec.legacyHz;
}

export function getDrumLowestNaturalHz(
  instrumentId: string,
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): number {
  const spec = DRUM_FUNDAMENTAL_SPECS[instrumentId] || DRUM_FUNDAMENTAL_SPECS.meiao;
  const active = isDrumStudioBankActive(instrumentId, studioFlagsOverride);
  const base = active ? spec.studioHz : spec.legacyHz;
  const sec = active ? (spec.studioSecondaryHz ?? spec.secondaryHz) : spec.secondaryHz;
  return sec !== undefined ? Math.min(base, sec) : base;
}

export function roundSemitonesTenth(st: number): number {
  const rounded = Math.round((Number(st) || 0) * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function computeTuningForTargetMidi(
  instrumentId: string,
  targetMidi: number,
  minSt?: number,
  maxSt?: number,
  referencePitchHz: number = DEFAULT_REFERENCE_PITCH_HZ,
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): number {
  const spec = DRUM_FUNDAMENTAL_SPECS[instrumentId] || DRUM_FUNDAMENTAL_SPECS.meiao;
  const [defMin, defMax] = spec.presetRangeSt;
  const lo = minSt ?? defMin;
  const hi = maxSt ?? defMax;
  const refHz = sanitizePitchHz(referencePitchHz);
  const baseHz = getDrumNaturalBaseHz(instrumentId, studioFlagsOverride);
  const baseMidi = 69 + 12 * Math.log2(baseHz / refHz);
  let deltaSt = targetMidi - baseMidi;
  if (deltaSt < lo || deltaSt > hi) {
    deltaSt -= 12 * Math.round(deltaSt / 12);
  }
  if ((instrumentId === 'caixa' || instrumentId === 'tarol') && Math.abs(deltaSt) < 0.08) {
    return 0;
  }
  const clamped = Math.max(lo, Math.min(hi, deltaSt));
  return roundSemitonesTenth(clamped);
}
