/**
 * lutherieFactoryPresets.ts — Accordage Signature par défaut (Do Majeur + Gonguê Sol4)
 * & Génération dynamique des 5 Presets d'Usine du Banc de Lutherie (< 135 lignes).
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

/** Accordage universel à froid : Do Majeur (Do2 • Mi2 • Sol2) + Gonguê Sol4 (392 Hz, 2 octaves au-dessus du Repique). */
export const DEFAULT_SIGNATURE_TUNINGS: Record<LutherieDrumRole, number> = {
  marcante: -1.5,
  meiao: 0.3,
  repique: 0.3,
  caixa: 0,
  tarol: 0,
  timbal: 0,
  gongue: -1.0,
};

export function getDefaultSignatureTuning(instrumentId?: string | null): number {
  if (!instrumentId) return 0;
  return instrumentId in DEFAULT_SIGNATURE_TUNINGS
    ? DEFAULT_SIGNATURE_TUNINGS[instrumentId as LutherieDrumRole]
    : 0;
}

interface HarmonicTargetSpec {
  marcanteMidi: number;
  meiaoMidi: number;
  repiqueMidi: number;
  snareRootMidi: number;
  snareFifthMidi: number;
  timbalMidi: number;
  gongueMidi: number;
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
    gongue: computeTuningForTargetMidi('gongue', targets.gongueMidi, -6, 6, undefined, studioFlagsOverride),
  };
}

const FULL_DECAYS: Record<LutherieDrumRole, number> = {
  marcante: 100, meiao: 100, repique: 100, caixa: 100, tarol: 100, timbal: 100, gongue: 100,
};

export function buildFactoryLutheriePresets(
  studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>
): LutheriePreset[] {
  return [
    {
      id: 'major_triad', nameFr: 'Do Majeur — Base', namePt: 'Dó Maior — Base', subtitle: 'Do2 • Mi2 • Sol2 + Sol4', isFactory: true,
      tunings: buildHarmonicTunings({ marcanteMidi: 36, meiaoMidi: 40, repiqueMidi: 43, snareRootMidi: 52, snareFifthMidi: 55, timbalMidi: 55, gongueMidi: 67 }, studioFlagsOverride),
      decays: { ...FULL_DECAYS },
    },
    {
      id: 'minor_triad', nameFr: 'Ré Mineur', namePt: 'Ré Menor', subtitle: 'Ré2 • Fa2 • La2 + La4', isFactory: true,
      tunings: buildHarmonicTunings({ marcanteMidi: 38, meiaoMidi: 41, repiqueMidi: 45, snareRootMidi: 50, snareFifthMidi: 57, timbalMidi: 57, gongueMidi: 69 }, studioFlagsOverride),
      decays: { marcante: 92, meiao: 95, repique: 100, caixa: 95, tarol: 95, timbal: 100, gongue: 100 },
    },
    {
      id: 'fifth_octave', nameFr: 'Quinte & Octave', namePt: 'Quinta & Oitava', subtitle: 'La1 • Mi2 • La2 + La4', isFactory: true,
      tunings: buildHarmonicTunings({ marcanteMidi: 33, meiaoMidi: 40, repiqueMidi: 45, snareRootMidi: 52, snareFifthMidi: 57, timbalMidi: 57, gongueMidi: 69 }, studioFlagsOverride),
      decays: { marcante: 88, meiao: 92, repique: 100, caixa: 92, tarol: 95, timbal: 95, gongue: 100 },
    },
    {
      id: 'fast_tight', nameFr: 'Baque Sec & Tendu', namePt: 'Baque Seco & Tenso', subtitle: 'Ré2 • Fa#2 • La2 + La4', isFactory: true,
      tunings: buildHarmonicTunings({ marcanteMidi: 38, meiaoMidi: 42, repiqueMidi: 45, snareRootMidi: 50, snareFifthMidi: 57, timbalMidi: 57, gongueMidi: 69 }, studioFlagsOverride),
      decays: { marcante: 68, meiao: 74, repique: 82, caixa: 75, tarol: 75, timbal: 80, gongue: 90 },
    },
    {
      id: 'studio_natural', nameFr: 'Brut Studio (Origine)', namePt: 'Estúdio Bruto', subtitle: '0 st • Sol#4', isFactory: true,
      tunings: { marcante: 0, meiao: 0, repique: 0, caixa: 0, tarol: 0, timbal: 0, gongue: 0 },
      decays: { ...FULL_DECAYS },
    },
  ];
}
