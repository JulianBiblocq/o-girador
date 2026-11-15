/**
 * lutherieFactoryPresets.ts — Génération dynamique des 6 Presets d'Usine du Banc de Lutherie (< 120 lignes).
 * - Alfaias Studio calibrées au dixième de demi-ton (`0.1 st`) vers de vraies cibles harmoniques.
 * - Tant que `STUDIO_BANK_ENABLED` vaut `false` sur `caixa`/`tarol`/`timbal`, leur offset d'usine reste à `0 st`.
 * - Dès passage en Studio, `caixa`/`tarol` sont bornés à `[-2.0, +2.0 st]` et `timbal` à `[-5.0, +5.0 st]`.
 */

import { PendingStudioInstrumentId } from '../../universes/maracatu/instruments/studioBankRegistry';
import { computeTuningForTargetMidi, isDrumStudioBankActive } from './drumFundamentalRegistry';

export const LUTHERIE_DRUM_ROLES = [
  'marcante',
  'meiao',
  'repique',
  'caixa',
  'tarol',
  'timbal',
  'gongue',
] as const;

export type LutherieDrumRole = (typeof LUTHERIE_DRUM_ROLES)[number];

export interface LutheriePreset {
  id: string;
  nameFr: string;
  namePt: string;
  subtitle?: string;
  isFactory?: boolean;
  tunings: Record<LutherieDrumRole, number>;
  decays: Record<LutherieDrumRole, number>;
}

interface HarmonicTargetSpec {
  marcanteMidi: number;
  meiaoMidi: number;
  repiqueMidi: number;
  snareRootMidi: number;
  snareFifthMidi: number;
  timbalMidi: number;
}

function buildHarmonicTunings(
  targets: HarmonicTargetSpec,
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): Record<LutherieDrumRole, number> {
  const optionalStudioTuning = (role: 'caixa' | 'tarol' | 'timbal', targetMidi: number): number => {
    if (!isDrumStudioBankActive(role, studioFlagsOverride)) return 0;
    return computeTuningForTargetMidi(role, targetMidi, undefined, undefined, undefined, studioFlagsOverride);
  };

  return {
    marcante: computeTuningForTargetMidi('marcante', targets.marcanteMidi, -5, 5, undefined, studioFlagsOverride),
    meiao: computeTuningForTargetMidi('meiao', targets.meiaoMidi, -5, 5, undefined, studioFlagsOverride),
    repique: computeTuningForTargetMidi('repique', targets.repiqueMidi, -5, 5, undefined, studioFlagsOverride),
    caixa: optionalStudioTuning('caixa', targets.snareRootMidi),
    tarol: optionalStudioTuning('tarol', targets.snareFifthMidi),
    timbal: optionalStudioTuning('timbal', targets.timbalMidi),
    gongue: 0,
  };
}

export function buildFactoryLutheriePresets(
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): LutheriePreset[] {
  return [
    {
      id: 'studio_natural',
      nameFr: 'Studio Naturel',
      namePt: 'Estúdio Natural',
      subtitle: 'Peaux brutes (0 st)',
      isFactory: true,
      tunings: { marcante: 0, meiao: 0, repique: 0, caixa: 0, tarol: 0, timbal: 0, gongue: 0 },
      decays: { marcante: 100, meiao: 100, repique: 100, caixa: 95, tarol: 95, timbal: 100, gongue: 100 },
    },
    {
      id: 'gongue_minor',
      nameFr: 'Accord Gonguê Do#m',
      namePt: 'Acorde Gonguê Dó#m',
      subtitle: 'Do#2 • Mi2 • Sol#2',
      isFactory: true,
      tunings: buildHarmonicTunings(
        { marcanteMidi: 37, meiaoMidi: 40, repiqueMidi: 44, snareRootMidi: 52, snareFifthMidi: 56, timbalMidi: 56 },
        studioFlagsOverride
      ),
      decays: { marcante: 95, meiao: 95, repique: 100, caixa: 95, tarol: 95, timbal: 100, gongue: 100 },
    },
    {
      id: 'major_triad',
      nameFr: 'Accord Majeur',
      namePt: 'Acorde Maior',
      subtitle: 'Do2 • Mi2 • Sol2',
      isFactory: true,
      tunings: buildHarmonicTunings(
        { marcanteMidi: 36, meiaoMidi: 40, repiqueMidi: 43, snareRootMidi: 52, snareFifthMidi: 55, timbalMidi: 55 },
        studioFlagsOverride
      ),
      decays: { marcante: 92, meiao: 95, repique: 100, caixa: 95, tarol: 95, timbal: 100, gongue: 100 },
    },
    {
      id: 'minor_triad',
      nameFr: 'Accord Mineur',
      namePt: 'Acorde Menor',
      subtitle: 'Ré2 • Fa2 • La2',
      isFactory: true,
      tunings: buildHarmonicTunings(
        { marcanteMidi: 38, meiaoMidi: 41, repiqueMidi: 45, snareRootMidi: 50, snareFifthMidi: 57, timbalMidi: 57 },
        studioFlagsOverride
      ),
      decays: { marcante: 92, meiao: 95, repique: 100, caixa: 95, tarol: 95, timbal: 100, gongue: 100 },
    },
    {
      id: 'fifth_octave',
      nameFr: 'Quinte & Octave',
      namePt: 'Quinta & Oitava',
      subtitle: 'La1 • Mi2 • La2',
      isFactory: true,
      tunings: buildHarmonicTunings(
        { marcanteMidi: 33, meiaoMidi: 40, repiqueMidi: 45, snareRootMidi: 52, snareFifthMidi: 57, timbalMidi: 57 },
        studioFlagsOverride
      ),
      decays: { marcante: 88, meiao: 92, repique: 100, caixa: 92, tarol: 95, timbal: 95, gongue: 100 },
    },
    {
      id: 'fast_tight',
      nameFr: 'Baque Sec & Tendu',
      namePt: 'Baque Seco & Tenso',
      subtitle: 'Ré2 • Fa#2 • La2',
      isFactory: true,
      tunings: buildHarmonicTunings(
        { marcanteMidi: 38, meiaoMidi: 42, repiqueMidi: 45, snareRootMidi: 50, snareFifthMidi: 57, timbalMidi: 57 },
        studioFlagsOverride
      ),
      decays: { marcante: 68, meiao: 74, repique: 82, caixa: 75, tarol: 75, timbal: 80, gongue: 90 },
    },
  ];
}
