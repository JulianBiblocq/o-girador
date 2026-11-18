/**
 * rodaSpectralBreathingSolver.ts — Solveur pur d'Emboîtement Spectral Fixe par Formation ($f_0$ Tracking) (< 128 lignes).
 * - Règle d'Or : 100 % insensible à `isMute`, `isSolo`, `isHidden`, `Mute Groups` et `Tocar Junto`.
 * - Coupe-bas doux via `lowshelf` (`Q = 0.707`, `0 dB` à `0 %`/`[Avant]`, `-3.5 dB` à `75 %`, `-4.67 dB` à `100 %`)
 *   avec plafond d'auto-protection `<= 0.85 * f_lowest(selfRole)` (protégeant notamment la Basse `G` `95.39 Hz` du Timbal).
 */

import { instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';
import { PendingStudioInstrumentId } from '../../universes/maracatu/instruments/studioBankRegistry';
import { DRUM_FUNDAMENTAL_SPECS, getDrumNaturalBaseHz } from '../../utils/audio/drumFundamentalRegistry';

export const SPECTRAL_BREATHING_ROLES = ['marcante', 'meiao', 'repique', 'timbal', 'caixa', 'tarol'] as const;
export type SpectralBreathingRole = (typeof SPECTRAL_BREATHING_ROLES)[number];

export interface SpectralBiquadSpec {
  type: 'lowshelf' | 'peaking';
  frequencyHz: number;
  q: number;
  gainDb: number;
}

export type RodaSpectralPlan = Record<SpectralBreathingRole, SpectralBiquadSpec[]>;

const SHELF_Q = Math.SQRT1_2;
const NOMINAL_SHELF_DB_75 = -3.5;

export function isSpectralBreathingRole(role: string): role is SpectralBreathingRole {
  return (SPECTRAL_BREATHING_ROLES as readonly string[]).includes(role);
}

function resolveRoleAndVoice(track: Pick<TrackGroup, 'instrumentIdx'> & { instrumentId?: string }) {
  const inst = instrumentsConfig[track.instrumentIdx];
  const role = (typeof track.instrumentId === 'string' && track.instrumentId) ? track.instrumentId : (inst?.id ?? '');
  return { role, isVocal: Boolean(inst?.type === 'voice' || role === 'puxador' || role === 'coro' || role === 'toada') };
}

export function computeFormationSignature(
  allTracks: readonly TrackGroup[],
  effectiveBreathingAmount: number,
  disableEq = false
): string {
  const safeAmt = disableEq ? 0 : Math.max(0, Math.min(1, Number(effectiveBreathingAmount) || 0));
  const parts: string[] = [`amt:${safeAmt.toFixed(3)}`];
  for (let i = 0; i < allTracks.length; i++) {
    const t = allTracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    const { role, isVocal } = resolveRoleAndVoice(t);
    if (!role && !isVocal) continue;
    parts.push(`${isVocal ? 'vox' : role}:${(t.tuning ?? 0).toFixed(2)}`);
  }
  return parts.join('|');
}

export function clampProtectedLowShelfHz(rawCutoffHz: number, selfLowestHz: number): number {
  const ceilingHz = Math.max(20, 0.85 * selfLowestHz);
  return Math.max(20, Math.min(rawCutoffHz, ceilingHz));
}

export function solveRodaSpectralBreathing(
  allTracks: readonly TrackGroup[],
  effectiveBreathingAmount = 0.75,
  disableEq = false,
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): RodaSpectralPlan {
  const presentRoles = new Set<string>();
  const tuningSums = new Map<string, number>();
  const tuningCounts = new Map<string, number>();
  let hasVocal = false;

  for (let i = 0; i < allTracks.length; i++) {
    const t = allTracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    const { role, isVocal } = resolveRoleAndVoice(t);
    if (isVocal) hasVocal = true;
    if (!role) continue;
    presentRoles.add(role);
    tuningSums.set(role, (tuningSums.get(role) ?? 0) + (Number(t.tuning) || 0));
    tuningCounts.set(role, (tuningCounts.get(role) ?? 0) + 1);
  }

  const meanSt = (role: string): number => {
    const cnt = tuningCounts.get(role) ?? 0;
    return cnt > 0 ? (tuningSums.get(role) ?? 0) / cnt : 0;
  };
  const fLive = (role: string): number =>
    getDrumNaturalBaseHz(role, studioFlagsOverride) * Math.pow(2, meanSt(role) / 12);
  const fLowest = (role: string): number => {
    const base = getDrumNaturalBaseHz(role, studioFlagsOverride);
    const sec = DRUM_FUNDAMENTAL_SPECS[role]?.secondaryHz;
    return (sec !== undefined ? Math.min(base, sec) : base) * Math.pow(2, meanSt(role) / 12);
  };

  const safeAmt = disableEq ? 0 : Math.max(0, Math.min(1, Number.isFinite(effectiveBreathingAmount) ? effectiveBreathingAmount : 0.75));
  const scale = safeAmt <= 0 ? 0 : safeAmt / 0.75;
  const db = (active: boolean, nom75: number): number => {
    const v = active && scale > 0 ? nom75 * scale : 0;
    return Object.is(v, -0) ? 0 : Number(v.toFixed(4));
  };

  const hasMc = presentRoles.has('marcante'), hasMe = presentRoles.has('meiao'), hasRp = presentRoles.has('repique');
  const hasTb = presentRoles.has('timbal'), hasCx = presentRoles.has('caixa'), hasTr = presentRoles.has('tarol');
  const hasPocket = presentRoles.has('gongue') || hasVocal;

  const fMc = fLive('marcante'), fMe = fLive('meiao'), fRp = fLive('repique');
  const fTb = fLive('timbal'), fCx = fLive('caixa'), fTr = fLive('tarol');

  return {
    marcante: [
      { type: 'peaking', frequencyHz: fMe, q: 4.0, gainDb: db(hasMe, -2.5) },
      { type: 'peaking', frequencyHz: fRp, q: 4.0, gainDb: db(hasRp, -2.5) },
      { type: 'peaking', frequencyHz: 360, q: 1.6, gainDb: db(hasPocket, -2.2) },
    ],
    meiao: [
      { type: 'lowshelf', frequencyHz: clampProtectedLowShelfHz(fMc * 1.05, fLowest('meiao')), q: SHELF_Q, gainDb: db(hasMc, NOMINAL_SHELF_DB_75) },
      { type: 'peaking', frequencyHz: fRp, q: 4.0, gainDb: db(hasRp, -2.5) },
      { type: 'peaking', frequencyHz: fTb, q: 3.5, gainDb: db(hasTb, -2.0) },
      { type: 'peaking', frequencyHz: 360, q: 1.6, gainDb: db(hasPocket, -2.2) },
    ],
    repique: [
      { type: 'lowshelf', frequencyHz: clampProtectedLowShelfHz(fMe * 0.92, fLowest('repique')), q: SHELF_Q, gainDb: db(hasMe, NOMINAL_SHELF_DB_75) },
      { type: 'peaking', frequencyHz: fMe, q: 4.0, gainDb: db(hasMe, -2.2) },
      { type: 'peaking', frequencyHz: fTb, q: 3.5, gainDb: db(hasTb, -2.0) },
      { type: 'peaking', frequencyHz: 360, q: 1.6, gainDb: db(hasPocket, -2.2) },
    ],
    timbal: [
      { type: 'lowshelf', frequencyHz: clampProtectedLowShelfHz(fMc * 1.08, fLowest('timbal')), q: SHELF_Q, gainDb: db(hasMc, NOMINAL_SHELF_DB_75) },
      { type: 'peaking', frequencyHz: 360, q: 1.6, gainDb: db(hasPocket, -2.2) },
    ],
    caixa: [
      { type: 'peaking', frequencyHz: fTr, q: 3.5, gainDb: db(hasCx && hasTr, -2.5) },
    ],
    tarol: [
      { type: 'lowshelf', frequencyHz: clampProtectedLowShelfHz(Math.max(140, fCx * 1.08), fLowest('tarol')), q: SHELF_Q, gainDb: db(hasCx && hasTr, NOMINAL_SHELF_DB_75) },
    ],
  };
}
