/**
 * afinadorGroupAligner.ts — Contrat Profil Groupe Afinador & Alignement Harmonique sur le Gonguê (< 130 lignes).
 * - Gonguê replié autour de 414.5 Hz (Sol#4) et borné dans [-6.0, +6.0 st] (12 notes Ré4..Do#5 100 % justes).
 * - Alfaias (marcante < meiao < repique) bornées dans [-4.5, +4.5 st] sur la Quinte ou la Tonique minimisant Σ|st|.
 */
import { doc, getDoc } from 'firebase/firestore';
import { getGroupIdVariants } from '../../services/cloud-groups/cloudGroupVariants';
import { getDrumNaturalBaseHz, roundSemitonesTenth } from './drumFundamentalRegistry';
import { LutherieDrumRole } from './lutherieFactoryPresets';

export type GongueAlignColor = 'major' | 'minor' | 'exact';

export interface AfinadorGroupTuningProfile {
  gongueHz?: number; drumsHz?: Partial<Record<LutherieDrumRole, number>>; mode?: 'major' | 'minor'; updatedAt?: number;
}
export interface ChromaticGongueOption { midi: number; hz: number; labelFr: string; labelPt: string; intl: string; }
export interface GongueAlignmentResult {
  tunings: Record<LutherieDrumRole, number>; effectiveGongueHz: number;
  keyLabelFr: string; keyLabelPt: string; bellRelation: 'fifth' | 'tonic' | 'exact';
}

export const AFINADOR_LOCAL_STORAGE_KEY = 'ogirador_afinador_profile_v1';
export const DEFAULT_GONGUE_STUDIO_HZ = 414.5;

const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTES_PT = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
const NOTES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const EXACT_ROLE_MAX_ST: Record<LutherieDrumRole, number> = {
  marcante: 4.5, meiao: 4.5, repique: 4.5, caixa: 2.0, tarol: 2.0, timbal: 3.5, gongue: 6.0,
};

export const GONGUE_CHROMATIC_OPTIONS: ChromaticGongueOption[] = Array.from({ length: 12 }, (_, idx) => {
  const midi = 62 + idx, pc = ((midi % 12) + 12) % 12, oct = Math.floor(midi / 12) - 1;
  const hz = midi === 68 ? DEFAULT_GONGUE_STUDIO_HZ : Math.round(440 * Math.pow(2, (midi - 69) / 12) * 10) / 10;
  return { midi, hz, labelFr: `${NOTES_FR[pc]}${oct}`, labelPt: `${NOTES_PT[pc]}${oct}`, intl: `${NOTES_INTL[pc]}${oct}` };
});

export function loadLocalAfinadorProfile(): AfinadorGroupTuningProfile {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AFINADOR_LOCAL_STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const hz = Number(parsed.gongueHz);
      return {
        gongueHz: Number.isFinite(hz) && hz >= 80 && hz <= 2000 ? hz : DEFAULT_GONGUE_STUDIO_HZ,
        mode: parsed.mode === 'minor' ? 'minor' : 'major',
        drumsHz: parsed.drumsHz && typeof parsed.drumsHz === 'object' ? parsed.drumsHz : undefined,
      };
    }
  } catch (_) {}
  return { gongueHz: DEFAULT_GONGUE_STUDIO_HZ, mode: 'major' };
}

export function saveLocalAfinadorProfile(patch: Partial<AfinadorGroupTuningProfile>): AfinadorGroupTuningProfile {
  const next: AfinadorGroupTuningProfile = { ...loadLocalAfinadorProfile(), ...patch, updatedAt: Date.now() };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(AFINADOR_LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch (_) {}
  return next;
}

export async function fetchGroupAfinadorCloudProfile(groupId?: string | null): Promise<AfinadorGroupTuningProfile | null> {
  const cleanId = (groupId || '').trim();
  if (!cleanId) return null;
  try {
    const { db } = await import('../../firebase/config');
    for (const variant of getGroupIdVariants(cleanId)) {
      try {
        const snap = await getDoc(doc(db, 'associations', variant));
        const af = snap.exists() ? snap.data()?.afinador : null;
        if (af && typeof af === 'object' && (typeof af.gongueHz === 'number' || af.drumsHz)) return af as AfinadorGroupTuningProfile;
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

export function computeDrumFoldedTuning(role: LutherieDrumRole, targetHz: number, maxAbsSt = EXACT_ROLE_MAX_ST[role]): number {
  const baseHz = getDrumNaturalBaseHz(role);
  if (!Number.isFinite(targetHz) || targetHz <= 20) return 0;
  const rawSt = 12 * Math.log2(targetHz / baseHz);
  return roundSemitonesTenth(Math.max(-maxAbsSt, Math.min(maxAbsSt, rawSt - 12 * Math.round(rawSt / 12))));
}

export function computeGongueAlignedTunings(
  targetGongueHz: number, color: GongueAlignColor = 'major', drumsHz?: Partial<Record<LutherieDrumRole, number>>
): GongueAlignmentResult {
  const safeHz = Number.isFinite(targetGongueHz) && targetGongueHz > 20 ? targetGongueHz : DEFAULT_GONGUE_STUDIO_HZ;
  const gongueSt = computeDrumFoldedTuning('gongue', safeHz, 6.0);
  const effectiveGongueHz = Math.round(getDrumNaturalBaseHz('gongue') * Math.pow(2, gongueSt / 12) * 10) / 10;
  const bellMidiExact = 69 + 12 * Math.log2(effectiveGongueHz / 440), bellMidiRound = Math.round(bellMidiExact);
  const microShift = Math.abs(bellMidiExact - bellMidiRound) >= 0.15 ? bellMidiExact - bellMidiRound : 0;
  const bellPc = ((bellMidiRound % 12) + 12) % 12, isMinor = color === 'minor', thirdInt = isMinor ? 3 : 4;
  const baseMidis = [37.471, 39.726, 42.703];
  let best = { m: -1.5, me: 0.3, r: 0.3, cost: Infinity, rootPc: 0, rel: 'fifth' as 'fifth' | 'tonic' };

  for (const [rel, rootPc] of [['fifth', (bellPc + 5) % 12], ['tonic', bellPc]] as const) {
    const triad = [rootPc, (rootPc + thirdInt) % 12, (rootPc + 7) % 12];
    for (let m1 = 33; m1 <= 42; m1++) {
      if (!triad.includes(m1 % 12)) continue;
      for (let m2 = m1 + 1; m2 <= 44; m2++) {
        if (!triad.includes(m2 % 12) || m2 % 12 === m1 % 12) continue;
        for (let m3 = m2 + 1; m3 <= 47; m3++) {
          if (!triad.includes(m3 % 12) || m3 % 12 === m1 % 12 || m3 % 12 === m2 % 12) continue;
          const d = [m1 + microShift - baseMidis[0], m2 + microShift - baseMidis[1], m3 + microShift - baseMidis[2]];
          if (d.some((x) => Math.abs(x) > 4.54)) continue;
          const st = d.map((x) => roundSemitonesTenth(Math.max(-4.5, Math.min(4.5, x))));
          const cost = Math.abs(st[0]) + Math.abs(st[1]) + Math.abs(st[2]) + (m1 % 12 === rootPc ? 0 : 0.02) + (rel === 'fifth' ? 0 : 0.01);
          if (cost < best.cost) best = { m: st[0], me: st[1], r: st[2], cost, rootPc, rel };
        }
      }
    }
  }

  const tunings: Record<LutherieDrumRole, number> = { marcante: best.m, meiao: best.me, repique: best.r, caixa: 0, tarol: 0, timbal: 0, gongue: gongueSt };
  if (color === 'exact' && drumsHz) {
    (Object.keys(EXACT_ROLE_MAX_ST) as LutherieDrumRole[]).forEach((role) => {
      if (typeof drumsHz[role] === 'number' && drumsHz[role]! > 20) tunings[role] = computeDrumFoldedTuning(role, drumsHz[role]!, EXACT_ROLE_MAX_ST[role]);
    });
    return { tunings, effectiveGongueHz, keyLabelFr: 'Parc Afinador', keyLabelPt: 'Parque Afinador', bellRelation: 'exact' };
  }
  return {
    tunings, effectiveGongueHz,
    keyLabelFr: `${NOTES_FR[best.rootPc]} ${isMinor ? 'Mineur' : 'Majeur'}`,
    keyLabelPt: `${NOTES_PT[best.rootPc]} ${isMinor ? 'Menor' : 'Maior'}`,
    bellRelation: best.rel,
  };
}
